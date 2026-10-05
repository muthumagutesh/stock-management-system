from django.db import models
from apps.inventory.models import Product

class DemandForecast(models.Model):
    class RiskLevel(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical Risk'
        HIGH = 'HIGH', 'High Risk'
        MEDIUM = 'MEDIUM', 'Medium Risk'
        LOW = 'LOW', 'Low Risk'

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='forecast')
    forecast_date = models.DateField(auto_now=True)
    daily_velocity = models.FloatField(default=0.0, help_text="Average daily units consumed/sold")
    
    # Next 30/60/90 days prediction
    predicted_demand_next_7_days = models.IntegerField(default=0)
    predicted_demand_next_30_days = models.IntegerField(default=0)
    predicted_demand_next_60_days = models.IntegerField(default=0)
    predicted_demand_next_90_days = models.IntegerField(default=0)
    
    recommended_reorder_qty = models.IntegerField(default=0)
    days_until_stockout = models.IntegerField(default=999)
    stockout_risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.LOW)
    confidence_score = models.FloatField(default=0.92, help_text="Statistical confidence percentage (0.0 to 1.0)")

    # AI Price Optimization & Margin Intelligence
    optimal_price_recommendation = models.DecimalField(max_digits=14, decimal_places=2, default=0.0, help_text="AI recommended selling price (₹)")
    potential_margin_increase_percent = models.FloatField(default=4.5, help_text="Projected margin increase %")

    # Expiry / Waste Risk
    is_waste_risk = models.BooleanField(default=False)
    waste_risk_reason = models.CharField(max_length=255, blank=True, default='')

    last_calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['days_until_stockout']

    def __str__(self):
        return f"Forecast for {self.product.name}: {self.stockout_risk_level} ({self.days_until_stockout} days left)"
