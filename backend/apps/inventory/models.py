from django.db import models
from django.conf import settings
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, default='Package', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    class StockStatus(models.TextChoices):
        OUT_OF_STOCK = 'OUT_OF_STOCK', 'Out of Stock'
        LOW_STOCK = 'LOW_STOCK', 'Low Stock'
        OPTIMAL = 'OPTIMAL', 'Optimal'
        OVERSTOCKED = 'OVERSTOCKED', 'Overstocked'

    class GSTRate(models.DecimalField):
        pass

    GST_RATE_CHOICES = [
        (Decimal('0.00'), '0% (Exempt)'),
        (Decimal('5.00'), '5% (Essential Goods)'),
        (Decimal('12.00'), '12% (Standard Lower)'),
        (Decimal('18.00'), '18% (Standard Manufacturing)'),
        (Decimal('28.00'), '28% (Luxury / High Tech)'),
    ]

    sku = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    barcode = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    hsn_code = models.CharField(max_length=20, default='8501', db_index=True, help_text="Indian GST HSN/SAC Code (e.g. 8501, 8471)")
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'), choices=GST_RATE_CHOICES)
    
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=30, default='pcs') # pcs, kg, box, metric_ton, meters, etc.
    
    cost_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Cost Price in Indian Rupees (₹)")
    selling_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Wholesale / Selling Price in ₹")
    mrp = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Maximum Retail Price (₹)")
    
    quantity_on_hand = models.IntegerField(default=0)
    min_stock_level = models.IntegerField(default=10) # Reorder trigger point
    max_stock_level = models.IntegerField(default=500)
    reorder_quantity = models.IntegerField(default=50) # Standard replenishment amount
    
    batch_number = models.CharField(max_length=64, blank=True, default='')
    expiry_date = models.DateField(null=True, blank=True, help_text="For chemical, perishable or batch shelf-life tracking")
    
    location = models.CharField(max_length=100, blank=True, default='Pune Warehouse Bay A-1')
    image_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku', 'name']),
            models.Index(fields=['quantity_on_hand', 'min_stock_level']),
            models.Index(fields=['hsn_code']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku}) - HSN:{self.hsn_code}"

    @property
    def stock_status(self) -> str:
        if self.quantity_on_hand <= 0:
            return self.StockStatus.OUT_OF_STOCK
        elif self.quantity_on_hand <= self.min_stock_level:
            return self.StockStatus.LOW_STOCK
        elif self.quantity_on_hand > self.max_stock_level:
            return self.StockStatus.OVERSTOCKED
        return self.StockStatus.OPTIMAL

    @property
    def total_cost_value(self) -> Decimal:
        return Decimal(self.quantity_on_hand) * self.cost_price

    @property
    def total_retail_value(self) -> Decimal:
        return Decimal(self.quantity_on_hand) * self.selling_price

    @property
    def gross_margin_percent(self) -> float:
        if self.selling_price and self.selling_price > 0:
            margin = ((self.selling_price - self.cost_price) / self.selling_price) * 100
            return round(float(margin), 2)
        return 0.0

    @property
    def is_expired_or_near(self) -> bool:
        from django.utils import timezone
        from datetime import timedelta
        if not self.expiry_date:
            return False
        return self.expiry_date <= (timezone.now().date() + timedelta(days=30))


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = 'IN', 'Restock / Inbound Receipt (In)'
        OUT = 'OUT', 'Sales Dispatch (Out)'
        ADJUSTMENT = 'ADJUSTMENT', 'Physical Cycle Count Adjustment'
        RETURN = 'RETURN', 'Customer RMA Return (In)'
        WASTE = 'WASTE', 'Damaged / Expired Write-off (Out)'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.IntegerField() # Absolute delta
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    reference_number = models.CharField(max_length=100, blank=True, default='') # PO-2026-0001, SO-2026-0001
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['product', 'timestamp']),
            models.Index(fields=['movement_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.movement_type} {self.quantity} x {self.product.name} ({self.timestamp:%Y-%m-%d %H:%M})"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT', 'Stock Adjustment'
        STATUS_CHANGE = 'STATUS_CHANGE', 'Status Change'
        PRICE_CHANGE = 'PRICE_CHANGE', 'Price Revision'
        LOGIN = 'LOGIN', 'User Authentication'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=30, choices=Action.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.user} - {self.action} on {self.model_name}:{self.object_id}"
