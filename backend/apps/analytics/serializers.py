from rest_framework import serializers
from .models import DemandForecast

class DemandForecastSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    hsn_code = serializers.CharField(source='product.hsn_code', read_only=True)
    current_stock = serializers.IntegerField(source='product.quantity_on_hand', read_only=True)
    min_stock_level = serializers.IntegerField(source='product.min_stock_level', read_only=True)
    current_selling_price = serializers.DecimalField(source='product.selling_price', max_digits=14, decimal_places=2, read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)

    class Meta:
        model = DemandForecast
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'product_unit', 'hsn_code',
            'category_name', 'current_stock', 'min_stock_level', 'current_selling_price',
            'daily_velocity', 'predicted_demand_next_7_days',
            'predicted_demand_next_30_days', 'predicted_demand_next_60_days', 'predicted_demand_next_90_days',
            'recommended_reorder_qty', 'days_until_stockout', 'stockout_risk_level',
            'confidence_score', 'optimal_price_recommendation', 'potential_margin_increase_percent',
            'is_waste_risk', 'waste_risk_reason', 'forecast_date', 'last_calculated_at'
        ]
