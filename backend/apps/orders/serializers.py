from rest_framework import serializers
from decimal import Decimal
from .models import Supplier, Customer, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from apps.inventory.models import Product

class SupplierSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(source='purchase_orders.count', read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'code', 'gstin', 'pan', 'state', 'contact_name',
            'email', 'phone', 'address', 'lead_time_days', 'rating',
            'reliability_score', 'payment_terms', 'is_active',
            'orders_count', 'created_at'
        ]


class CustomerSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(source='sales_orders.count', read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'code', 'customer_type', 'gstin', 'pan', 'state',
            'contact_name', 'email', 'phone', 'address',
            'credit_limit', 'balance', 'loyalty_points',
            'orders_count', 'created_at'
        ]


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    hsn_code = serializers.CharField(source='product.hsn_code', read_only=True)
    gst_rate = serializers.DecimalField(source='product.gst_rate', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'product_unit',
            'hsn_code', 'gst_rate', 'quantity_ordered', 'quantity_received',
            'unit_cost', 'total_cost'
        ]
        read_only_fields = ['id', 'total_cost']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_gstin = serializers.CharField(source='supplier.gstin', read_only=True)
    supplier_state = serializers.CharField(source='supplier.state', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'supplier', 'supplier_name', 'supplier_gstin', 'supplier_state',
            'status', 'ordered_date', 'expected_delivery_date', 'received_date',
            'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount',
            'is_inter_state', 'e_way_bill_number',
            'created_by', 'created_by_name',
            'items', 'items_count', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'po_number', 'ordered_date', 'received_date', 'created_at', 'updated_at']


class PurchaseOrderCreateItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)
    unit_cost = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)


class PurchaseOrderCreateSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField(required=True)
    expected_delivery_date = serializers.DateField(required=False, allow_null=True)
    is_inter_state = serializers.BooleanField(default=False)
    e_way_bill_number = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = PurchaseOrderCreateItemInputSerializer(many=True, required=True)

    def create(self, validated_data):
        from django.utils import timezone
        supplier = Supplier.objects.get(id=validated_data['supplier_id'])
        items_data = validated_data['items']
        
        po_count = PurchaseOrder.objects.count() + 1
        po_number = f"PO-IN-{timezone.now().year}-{po_count:04d}"
        
        user = self.context['request'].user if self.context.get('request') and self.context['request'].user.is_authenticated else None
        
        po = PurchaseOrder.objects.create(
            po_number=po_number,
            supplier=supplier,
            expected_delivery_date=validated_data.get('expected_delivery_date'),
            is_inter_state=validated_data.get('is_inter_state', False),
            e_way_bill_number=validated_data.get('e_way_bill_number', ''),
            notes=validated_data.get('notes', ''),
            created_by=user,
            status=PurchaseOrder.Status.ORDERED
        )
        
        for item in items_data:
            product = Product.objects.get(id=item['product_id'])
            cost = item.get('unit_cost') or product.cost_price
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                quantity_ordered=item['quantity'],
                unit_cost=cost
            )
        
        po.recalculate_total()
        return po


class SalesOrderItemSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    hsn_code = serializers.CharField(source='product.hsn_code', read_only=True)
    gst_rate = serializers.DecimalField(source='product.gst_rate', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = SalesOrderItem
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'product_unit',
            'hsn_code', 'gst_rate', 'quantity', 'unit_price', 'discount', 'total_price'
        ]
        read_only_fields = ['id', 'total_price']


class SalesOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_gstin = serializers.CharField(source='customer.gstin', read_only=True)
    customer_state = serializers.CharField(source='customer.state', read_only=True)
    items = SalesOrderItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            'id', 'so_number', 'customer', 'customer_name', 'customer_gstin', 'customer_state',
            'status', 'payment_status', 'order_date', 'shipped_date',
            'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount',
            'is_inter_state', 'e_way_bill_number', 'razorpay_order_id', 'razorpay_payment_id',
            'created_by', 'created_by_name',
            'items', 'items_count', 'shipping_address', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'so_number', 'order_date', 'shipped_date', 'created_at', 'updated_at']


class SalesOrderCreateItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))


class SalesOrderCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True, default='')
    is_inter_state = serializers.BooleanField(default=False)
    e_way_bill_number = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    payment_status = serializers.ChoiceField(choices=SalesOrder.PaymentStatus.choices, default=SalesOrder.PaymentStatus.PAID)
    items = SalesOrderCreateItemInputSerializer(many=True, required=True)

    def validate(self, attrs):
        for item in attrs['items']:
            product = Product.objects.filter(id=item['product_id']).first()
            if not product:
                raise serializers.ValidationError(f"Product ID {item['product_id']} not found.")
            if product.quantity_on_hand < item['quantity']:
                raise serializers.ValidationError(
                    f"Insufficient stock for '{product.name}'. Requested {item['quantity']}, available {product.quantity_on_hand}."
                )
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        customer = Customer.objects.get(id=validated_data['customer_id'])
        items_data = validated_data['items']

        so_count = SalesOrder.objects.count() + 1
        so_number = f"SO-IN-{timezone.now().year}-{so_count:04d}"

        user = self.context['request'].user if self.context.get('request') and self.context['request'].user.is_authenticated else None

        so = SalesOrder.objects.create(
            so_number=so_number,
            customer=customer,
            shipping_address=validated_data.get('shipping_address') or customer.address,
            is_inter_state=validated_data.get('is_inter_state', False),
            e_way_bill_number=validated_data.get('e_way_bill_number', ''),
            notes=validated_data.get('notes', ''),
            payment_status=validated_data.get('payment_status', SalesOrder.PaymentStatus.PAID),
            status=SalesOrder.Status.PROCESSING,
            created_by=user
        )

        for item in items_data:
            product = Product.objects.get(id=item['product_id'])
            price = item.get('unit_price') or product.selling_price
            SalesOrderItem.objects.create(
                sales_order=so,
                product=product,
                quantity=item['quantity'],
                unit_price=price,
                discount=item.get('discount', Decimal('0.00'))
            )

        so.recalculate_total()
        return so
