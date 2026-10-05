import io
import csv
import base64
import qrcode
from decimal import Decimal
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse

from .models import Category, Product, StockMovement, AuditLog
from .serializers import (
    CategorySerializer, ProductSerializer, StockMovementSerializer,
    StockAdjustmentSerializer, AuditLogSerializer
)
from apps.authentication.permissions import IsStaffOrAbove, ReadOnlyOrManager, IsAdminRole
from apps.notifications.consumers import broadcast_realtime_event

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrManager]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [ReadOnlyOrManager]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'gst_rate']
    search_fields = ['sku', 'name', 'barcode', 'hsn_code', 'description', 'location']
    ordering_fields = ['name', 'quantity_on_hand', 'selling_price', 'created_at']

    def perform_create(self, serializer):
        product = serializer.save()
        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action=AuditLog.Action.CREATE,
            model_name='Product',
            object_id=str(product.id),
            changes={'name': product.name, 'sku': product.sku, 'initial_stock': product.quantity_on_hand, 'hsn': product.hsn_code}
        )
        broadcast_realtime_event('product_created', {'id': product.id, 'sku': product.sku, 'name': product.name})

    def perform_update(self, serializer):
        old_obj = self.get_object()
        old_price = old_obj.selling_price
        product = serializer.save()
        
        changes = {'name': product.name, 'sku': product.sku, 'stock': product.quantity_on_hand}
        action_type = AuditLog.Action.UPDATE
        if old_price != product.selling_price:
            action_type = AuditLog.Action.PRICE_CHANGE
            changes['price_change'] = {'from': str(old_price), 'to': str(product.selling_price)}

        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action=action_type,
            model_name='Product',
            object_id=str(product.id),
            changes=changes
        )
        broadcast_realtime_event('product_updated', {'id': product.id, 'sku': product.sku, 'name': product.name})

    @action(detail=True, methods=['post'], permission_classes=[ReadOnlyOrManager])
    def adjust_stock(self, request, pk=None):
        """Allows authorized staff to manually adjust stock levels with audit documentation."""
        product = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_qty = serializer.validated_data['new_quantity']
        reason = serializer.validated_data['reason']
        notes = serializer.validated_data.get('notes', '')

        with transaction.atomic():
            prev_qty = product.quantity_on_hand
            diff = new_qty - prev_qty
            
            product.quantity_on_hand = new_qty
            product.save(update_fields=['quantity_on_hand', 'updated_at'])

            movement = StockMovement.objects.create(
                product=product,
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity=abs(diff),
                previous_stock=prev_qty,
                new_stock=new_qty,
                unit_price=product.cost_price,
                reference_number=f"ADJ-IN-{product.id}-{product.movements.count()+1}",
                created_by=request.user if request.user.is_authenticated else None,
                notes=f"Reason: {reason}. {notes}".strip()
            )

            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action=AuditLog.Action.STOCK_ADJUSTMENT,
                model_name='Product',
                object_id=str(product.id),
                changes={
                    'sku': product.sku,
                    'previous_stock': prev_qty,
                    'new_stock': new_qty,
                    'delta': diff,
                    'reason': reason
                }
            )

        broadcast_realtime_event('stock_level_changed', {
            'product_id': product.id,
            'sku': product.sku,
            'new_stock': new_qty,
            'status': product.stock_status
        })

        return Response({
            'success': True,
            'message': f"Stock adjusted from {prev_qty} to {new_qty} {product.unit}",
            'product': ProductSerializer(product).data,
            'movement': StockMovementSerializer(movement).data
        })

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Generates dynamic QR Code data for Indian GST shipping labels & scanning."""
        product = self.get_object()
        qr_payload = f"APEXSTOCK|SKU:{product.sku}|NAME:{product.name}|HSN:{product.hsn_code}|MRP:{product.mrp}|PRICE:{product.selling_price}|GST:{product.gst_rate}%"
        
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return Response({
            'sku': product.sku,
            'name': product.name,
            'hsn_code': product.hsn_code,
            'qr_image_base64': f"data:image/png;base64,{img_str}",
            'qr_base64': img_str,
            'payload': qr_payload
        })

    @action(detail=False, methods=['post'], permission_classes=[ReadOnlyOrManager])
    def bulk_upload(self, request):
        """Bulk CSV/Excel upload endpoint for Indian catalog items."""
        csv_text = request.data.get('csv_data') or request.data.get('csv_content')
        file_obj = request.FILES.get('file')

        if not csv_text and not file_obj:
            return Response({'error': 'Please provide csv_data or csv_content text or upload a CSV file.'}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj:
            csv_content = file_obj.read().decode('utf-8')
        else:
            csv_content = csv_text

        reader = csv.DictReader(io.StringIO(csv_content))
        created_count = 0
        updated_count = 0
        errors = []

        default_cat = Category.objects.first()

        for idx, row in enumerate(reader, start=1):
            sku = row.get('SKU') or row.get('sku')
            name = row.get('Name') or row.get('name')
            if not sku or not name:
                errors.append(f"Row {idx}: Missing SKU or Name")
                continue

            hsn = row.get('HSN') or row.get('hsn_code') or '8501'
            cost = Decimal(str(row.get('Cost Price') or row.get('cost_price') or 0))
            sell = Decimal(str(row.get('Selling Price') or row.get('selling_price') or 0))
            qty = int(row.get('Quantity') or row.get('quantity') or 0)
            gst = Decimal(str(row.get('GST Rate') or row.get('gst_rate') or 18))
            unit = row.get('Unit') or row.get('unit') or 'pcs'
            loc = row.get('Location') or row.get('location') or 'Main Warehouse'

            prod, created = Product.objects.update_or_create(
                sku=sku.strip(),
                defaults={
                    'name': name.strip(),
                    'hsn_code': hsn.strip(),
                    'cost_price': cost,
                    'selling_price': sell,
                    'mrp': sell * Decimal('1.15'),
                    'quantity_on_hand': qty,
                    'gst_rate': gst,
                    'unit': unit.strip(),
                    'location': loc.strip(),
                    'category': default_cat
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response({
            'success': True,
            'created_count': created_count,
            'updated_count': updated_count,
            'created': created_count,
            'updated': updated_count,
            'errors': errors,
            'message': f"Imported {created_count} new products, updated {updated_count} existing."
        })

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        low_items = self.get_queryset().filter(quantity_on_hand__lte=F('min_stock_level'))
        serializer = self.get_serializer(low_items, many=True)
        return Response(serializer.data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsStaffOrAbove]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['movement_type', 'product']
    search_fields = ['product__name', 'product__sku', 'reference_number', 'notes']
    ordering_fields = ['timestamp', 'quantity']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [ReadOnlyOrManager]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name']
    search_fields = ['model_name', 'object_id', 'changes']
    ordering_fields = ['timestamp']
