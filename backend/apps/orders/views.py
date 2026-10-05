import secrets
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, Customer, PurchaseOrder, SalesOrder
from .serializers import (
    SupplierSerializer, CustomerSerializer,
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer,
    SalesOrderSerializer, SalesOrderCreateSerializer
)
from apps.authentication.permissions import IsStaffOrAbove, ReadOnlyOrManager
from apps.notifications.consumers import broadcast_realtime_event

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [ReadOnlyOrManager]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'gstin', 'pan', 'contact_name', 'email', 'phone']
    ordering_fields = ['name', 'rating', 'reliability_score', 'created_at']


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [ReadOnlyOrManager]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'gstin', 'pan', 'contact_name', 'email', 'phone']
    ordering_fields = ['name', 'balance', 'credit_limit', 'created_at']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by').prefetch_related('items__product').all()
    permission_classes = [IsStaffOrAbove]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'supplier', 'is_inter_state']
    search_fields = ['po_number', 'supplier__name', 'e_way_bill_number', 'notes']
    ordering_fields = ['ordered_date', 'total_amount', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        po = serializer.save()
        broadcast_realtime_event('po_created', {'id': po.id, 'po_number': po.po_number, 'supplier': po.supplier.name})
        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[ReadOnlyOrManager])
    def receive(self, request, pk=None):
        po = self.get_object()
        success, message = po.mark_as_received(user=request.user)
        if not success:
            return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)
        
        broadcast_realtime_event('po_received', {'id': po.id, 'po_number': po.po_number})
        return Response({
            'success': True,
            'message': message,
            'order': PurchaseOrderSerializer(po).data
        })


class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.select_related('customer', 'created_by').prefetch_related('items__product').all()
    permission_classes = [IsStaffOrAbove]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'customer', 'is_inter_state']
    search_fields = ['so_number', 'customer__name', 'e_way_bill_number', 'notes']
    ordering_fields = ['order_date', 'total_amount', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return SalesOrderCreateSerializer
        return SalesOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        so = serializer.save()
        broadcast_realtime_event('so_created', {'id': so.id, 'so_number': so.so_number, 'customer': so.customer.name})
        return Response(SalesOrderSerializer(so).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[ReadOnlyOrManager])
    def fulfill(self, request, pk=None):
        so = self.get_object()
        success, message = so.dispatch_and_fulfill(user=request.user)
        if not success:
            return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)
        
        broadcast_realtime_event('so_fulfilled', {'id': so.id, 'so_number': so.so_number})
        return Response({
            'success': True,
            'message': message,
            'order': SalesOrderSerializer(so).data
        })

    @action(detail=True, methods=['post'])
    def create_razorpay_order(self, request, pk=None):
        """Generates Razorpay UPI / Payment gateway checkout link in ₹ INR."""
        so = self.get_object()
        amount_paisa = int(so.total_amount * 100)
        rzp_order_id = f"order_{secrets.token_hex(10)}"
        
        so.razorpay_order_id = rzp_order_id
        so.save(update_fields=['razorpay_order_id'])

        return Response({
            'success': True,
            'razorpay_order_id': rzp_order_id,
            'amount_inr': float(so.total_amount),
            'amount_paisa': amount_paisa,
            'currency': 'INR',
            'customer_name': so.customer.name,
            'customer_email': so.customer.email,
            'upi_intent_uri': f"upi://pay?pa=apexstock@icici&pn=ApexStock+India&am={so.total_amount}&cu=INR&tn={so.so_number}",
            'payment_url': f"https://api.razorpay.com/v1/checkout/{rzp_order_id}"
        })
