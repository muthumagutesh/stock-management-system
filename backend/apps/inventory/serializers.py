from rest_framework import serializers
from .models import Category, Product, StockMovement, AuditLog

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'products_count', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.CharField(read_only=True)
    total_cost_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_retail_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    gross_margin_percent = serializers.FloatField(read_only=True)
    is_expired_or_near = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'barcode', 'hsn_code', 'gst_rate',
            'category', 'category_name', 'description', 'unit',
            'cost_price', 'selling_price', 'mrp',
            'quantity_on_hand', 'min_stock_level', 'max_stock_level', 'reorder_quantity',
            'batch_number', 'expiry_date', 'location', 'image_url', 'is_active',
            'stock_status', 'total_cost_value', 'total_retail_value', 'gross_margin_percent',
            'is_expired_or_near', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'product_unit',
            'movement_type', 'quantity', 'previous_stock', 'new_stock',
            'unit_price', 'reference_number', 'created_by', 'created_by_name',
            'timestamp', 'notes'
        ]
        read_only_fields = ['id', 'previous_stock', 'new_stock', 'timestamp', 'created_by']


class StockAdjustmentSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    new_quantity = serializers.IntegerField(required=True, min_value=0)
    reason = serializers.CharField(required=True, max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'model_name',
            'object_id', 'timestamp', 'ip_address', 'changes'
        ]
        read_only_fields = ['id', 'timestamp']
