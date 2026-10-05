import io
import csv
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Sum, Count, F, Q, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from apps.inventory.models import Product, Category, StockMovement
from apps.orders.models import PurchaseOrder, SalesOrder, Supplier
from apps.analytics.models import DemandForecast
from apps.analytics.serializers import DemandForecastSerializer
from apps.analytics.forecasting import run_full_inventory_forecast, calculate_product_forecast
from apps.notifications.consumers import broadcast_realtime_event

# Global in-memory / cacheable company GST settings
COMPANY_SETTINGS = {
    'company_name': 'ApexStock Industrial Solutions India Pvt Ltd',
    'gstin': '27AAACA9999P1Z8',
    'state': 'Maharashtra (27)',
    'pan': 'AAACA9999P',
    'address': 'Plot 42, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026',
    'currency': 'INR',
    'currency_symbol': '₹',
    'phone': '+91 20 6789 0100',
    'email': 'gst-support@apexstock.in',
    'sms_gateway': 'MSG91 Enterprise (Active)',
    'payment_gateway': 'Razorpay India (Enabled for UPI / NetBanking / Cards)',
    'e_way_bill_active': True,
    'default_gst_rate': 18.0
}

class DashboardKPIView(APIView):
    """Provides high-performance aggregated metrics in Indian Rupees (₹)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        products = Product.objects.filter(is_active=True)
        total_products = products.count()
        
        out_of_stock_count = products.filter(quantity_on_hand__lte=0).count()
        low_stock_count = products.filter(quantity_on_hand__gt=0, quantity_on_hand__lte=F('min_stock_level')).count()
        optimal_count = products.filter(quantity_on_hand__gt=F('min_stock_level'), quantity_on_hand__lte=F('max_stock_level')).count()
        overstocked_count = products.filter(quantity_on_hand__gt=F('max_stock_level')).count()

        # ₹ Valuation
        total_cost_valuation = sum((p.quantity_on_hand * p.cost_price for p in products), Decimal('0.00'))
        total_retail_valuation = sum((p.quantity_on_hand * p.selling_price for p in products), Decimal('0.00'))
        potential_profit = total_retail_valuation - total_cost_valuation

        # Orders metrics
        sales_30d = SalesOrder.objects.filter(order_date__gte=thirty_days_ago, status__in=[SalesOrder.Status.SHIPPED, SalesOrder.Status.DELIVERED])
        total_revenue_30d = sales_30d.aggregate(tot=Sum('total_amount'))['tot'] or Decimal('0.00')
        sales_orders_count = SalesOrder.objects.count()
        pending_sales_orders = SalesOrder.objects.filter(status__in=[SalesOrder.Status.PENDING, SalesOrder.Status.PROCESSING]).count()

        purchases_30d = PurchaseOrder.objects.filter(created_at__gte=thirty_days_ago, status=PurchaseOrder.Status.RECEIVED)
        total_spent_30d = purchases_30d.aggregate(tot=Sum('total_amount'))['tot'] or Decimal('0.00')
        pending_purchase_orders = PurchaseOrder.objects.filter(status__in=[PurchaseOrder.Status.ORDERED, PurchaseOrder.Status.PARTIALLY_RECEIVED]).count()

        # Monthly Trends (last 6 months in ₹)
        trends = []
        for i in range(5, -1, -1):
            m_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            next_m = (m_start + timedelta(days=32)).replace(day=1)
            month_label = m_start.strftime("%b %Y")
            
            m_rev = SalesOrder.objects.filter(
                order_date__gte=m_start, order_date__lt=next_m,
                status__in=[SalesOrder.Status.SHIPPED, SalesOrder.Status.DELIVERED]
            ).aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
            
            m_exp = PurchaseOrder.objects.filter(
                created_at__gte=m_start, created_at__lt=next_m,
                status=PurchaseOrder.Status.RECEIVED
            ).aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')

            trends.append({
                'month': month_label,
                'revenue': float(m_rev),
                'expenses': float(m_exp)
            })

        # Category Breakdown
        categories_data = []
        for cat in Category.objects.all():
            cat_products = products.filter(category=cat)
            val = sum((p.quantity_on_hand * p.cost_price for p in cat_products), Decimal('0.00'))
            categories_data.append({
                'id': cat.id,
                'name': cat.name,
                'product_count': cat_products.count(),
                'valuation': float(val)
            })

        return Response({
            'currency': 'INR',
            'currency_symbol': '₹',
            'kpis': {
                'total_products': total_products,
                'total_cost_valuation': float(total_cost_valuation),
                'total_retail_valuation': float(total_retail_valuation),
                'potential_profit': float(potential_profit),
                'monthly_revenue': float(total_revenue_30d),
                'monthly_expenses': float(total_spent_30d),
                'pending_sales_orders': pending_sales_orders,
                'pending_purchase_orders': pending_purchase_orders,
                'out_of_stock_count': out_of_stock_count,
                'low_stock_count': low_stock_count,
            },
            'stock_health': {
                'out_of_stock': out_of_stock_count,
                'low_stock': low_stock_count,
                'optimal': optimal_count,
                'overstocked': overstocked_count,
            },
            'monthly_trends': trends,
            'categories': categories_data,
        })


class DemandForecastListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        risk = request.query_params.get('risk')
        search = request.query_params.get('search')
        
        qs = DemandForecast.objects.select_related('product', 'product__category').all()
        if risk:
            qs = qs.filter(stockout_risk_level=risk.upper())
        if search:
            qs = qs.filter(Q(product__name__icontains=search) | Q(product__sku__icontains=search))
            
        serializer = DemandForecastSerializer(qs, many=True)
        return Response(serializer.data)


class RunForecastBatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        results = run_full_inventory_forecast()
        broadcast_realtime_event('forecast_updated', results)
        return Response({
            'success': True,
            'message': f"Forecast completed. Evaluated {results['total_products_evaluated']} products.",
            'details': results
        })


class QuickReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        supplier_id = request.data.get('supplier_id')
        items = request.data.get('items', [])
        
        if not supplier_id:
            supplier = Supplier.objects.first()
            if not supplier:
                return Response({'error': 'No suppliers found. Please create a supplier first.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            supplier = Supplier.objects.get(id=supplier_id)

        from apps.orders.models import PurchaseOrderItem
        po_count = PurchaseOrder.objects.count() + 1
        po = PurchaseOrder.objects.create(
            po_number=f"PO-IN-{timezone.now().year}-{po_count:04d}",
            supplier=supplier,
            notes="Auto-generated via AI Demand Reorder Engine",
            created_by=request.user,
            status=PurchaseOrder.Status.DRAFT
        )

        for item in items:
            product = Product.objects.get(id=item['product_id'])
            qty = item.get('quantity', product.reorder_quantity)
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                quantity_ordered=qty,
                unit_cost=product.cost_price
            )

        po.recalculate_total()
        return Response({
            'success': True,
            'message': f"Draft Purchase Order {po.po_number} generated successfully.",
            'po_id': po.id,
            'po_number': po.po_number,
            'total_amount': float(po.total_amount)
        })


class CompanySettingsView(APIView):
    """Retrieves or updates GST details, business profile, and gateway integrations."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(COMPANY_SETTINGS)

    def post(self, request):
        if not request.user.role == 'ADMIN' and not request.user.is_superuser:
            return Response({'error': 'Only system administrators can alter GST settings.'}, status=status.HTTP_403_FORBIDDEN)
        
        for k, v in request.data.items():
            if k in COMPANY_SETTINGS:
                COMPANY_SETTINGS[k] = v
        return Response({'success': True, 'message': 'Company & GST settings updated.', 'settings': COMPANY_SETTINGS})


class SupplierReliabilityView(APIView):
    """Returns AI reliability scores and punctuality ratings for Indian suppliers."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        suppliers = Supplier.objects.all()
        data = []
        for s in suppliers:
            data.append({
                'id': s.id,
                'name': s.name,
                'code': s.code,
                'gstin': s.gstin,
                'lead_time_days': s.lead_time_days,
                'rating': float(s.rating),
                'reliability_score': s.reliability_score,
                'total_orders': s.purchase_orders.count(),
                'state': s.state
            })
        return Response(data)


class ExportCSVView(APIView):
    """Generates RFC 4180 CSV export of Indian catalog items with HSN and GST."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="apexstock_india_inventory.csv"'

        writer = csv.writer(response)
        writer.writerow(['SKU', 'Product Name', 'HSN Code', 'Category', 'Unit', 'Cost Price (₹)', 'Selling Price (₹)', 'MRP (₹)', 'Stock Qty', 'Min Level', 'GST Rate (%)', 'Total Value (₹)'])

        for p in Product.objects.select_related('category').all():
            writer.writerow([
                p.sku,
                p.name,
                p.hsn_code,
                p.category.name if p.category else 'Unassigned',
                p.unit,
                f"{p.cost_price:.2f}",
                f"{p.selling_price:.2f}",
                f"{p.mrp:.2f}",
                p.quantity_on_hand,
                p.min_stock_level,
                f"{p.gst_rate:.0f}",
                f"{p.total_cost_value:.2f}"
            ])
        return response


class ExportExcelView(APIView):
    """Generates styled Excel workbook with OpenPyXL in Indian currency."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inventory Valuation (₹)"

        headers = ['SKU', 'Product Name', 'HSN Code', 'Category', 'Unit', 'Cost (₹)', 'Retail (₹)', 'MRP (₹)', 'Quantity', 'GST Rate (%)', 'Valuation (₹)']
        ws.append(headers)

        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        products = Product.objects.select_related('category').all()
        for row_idx, p in enumerate(products, start=2):
            ws.append([
                p.sku,
                p.name,
                p.hsn_code,
                p.category.name if p.category else 'N/A',
                p.unit,
                float(p.cost_price),
                float(p.selling_price),
                float(p.mrp),
                p.quantity_on_hand,
                float(p.gst_rate),
                float(p.total_cost_value)
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="apexstock_india_report.xlsx"'
        return response


class ExportPDFView(APIView):
    """Generates professional printable PDF inventory valuation report with Indian GST details."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.HexColor('#1E1B4B'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=14
        )

        story.append(Paragraph("ApexStock™ India Edition — Stock Valuation & GST Audit Report", title_style))
        story.append(Paragraph(f"Company: {COMPANY_SETTINGS['company_name']} | GSTIN: {COMPANY_SETTINGS['gstin']} | Generated on: {timezone.now():%d-%m-%Y %H:%M} IST", subtitle_style))
        story.append(Spacer(1, 8))

        data = [['SKU', 'Product Name', 'HSN', 'Unit', 'Qty', 'Cost (INR)', 'GST%', 'Total Valuation (INR)']]
        products = Product.objects.select_related('category').all()[:50]
        
        total_val = Decimal('0.00')
        for p in products:
            val = p.total_cost_value
            total_val += val
            data.append([
                p.sku,
                p.name[:25],
                p.hsn_code,
                p.unit,
                str(p.quantity_on_hand),
                f"Rs. {p.cost_price:,.2f}",
                f"{p.gst_rate:.0f}%",
                f"Rs. {val:,.2f}"
            ])

        table = Table(data, colWidths=[65, 140, 45, 35, 35, 75, 45, 95])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E1B4B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ]))
        story.append(table)

        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="apexstock_india_valuation.pdf"'
        return response
