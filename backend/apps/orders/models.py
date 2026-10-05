from django.db import models, transaction
from django.conf import settings
from decimal import Decimal
from apps.inventory.models import Product, StockMovement, AuditLog

class Supplier(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True, blank=True)
    gstin = models.CharField(max_length=15, blank=True, default='', help_text="15-digit GSTIN (e.g. 27AAACT2727Q1ZW)")
    pan = models.CharField(max_length=10, blank=True, default='')
    state = models.CharField(max_length=100, default='Maharashtra (27)', help_text="State and 2-digit GST state code")
    contact_name = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='', help_text="+91 Mobile or Landline")
    address = models.TextField(blank=True, default='')
    lead_time_days = models.PositiveIntegerField(default=5, help_text="Average supplier delivery lead time in days")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('4.5'))
    reliability_score = models.FloatField(default=95.0, help_text="AI Reliability Percentage (Delivery punctuality & quality)")
    payment_terms = models.CharField(max_length=100, default='Net 30 Days', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (GSTIN: {self.gstin or 'Unregistered'})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"SUP-IN-{Product.objects.count() + 101}"
        super().save(*args, **kwargs)


class Customer(models.Model):
    class CustomerType(models.TextChoices):
        WHOLESALE = 'WHOLESALE', 'B2B Wholesale / Manufacturing'
        RETAIL = 'RETAIL', 'B2C Retail'
        CORPORATE = 'CORPORATE', 'Corporate Enterprise Contract'

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True)
    customer_type = models.CharField(max_length=20, choices=CustomerType.choices, default=CustomerType.WHOLESALE)
    gstin = models.CharField(max_length=15, blank=True, default='', help_text="15-digit GSTIN for B2B tax credit")
    pan = models.CharField(max_length=10, blank=True, default='')
    state = models.CharField(max_length=100, default='Maharashtra (27)')
    contact_name = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    address = models.TextField(blank=True, default='')
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('500000.00'), help_text="Credit Limit in ₹")
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Outstanding balance in ₹")
    loyalty_points = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_customer_type_display()})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"CUST-IN-{Customer.objects.count() + 101}"
        super().save(*args, **kwargs)


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ORDERED = 'ORDERED', 'Ordered / In Transit'
        PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', 'Partially Received'
        RECEIVED = 'RECEIVED', 'Received / Fulfilled'
        CANCELLED = 'CANCELLED', 'Cancelled'

    po_number = models.CharField(max_length=64, unique=True, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    ordered_date = models.DateField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    received_date = models.DateTimeField(null=True, blank=True)
    
    # GST Breakdown (in ₹ INR)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    is_inter_state = models.BooleanField(default=False, help_text="True if supplier state differs from company warehouse state (IGST applicable)")

    e_way_bill_number = models.CharField(max_length=30, blank=True, default='', help_text="12-digit Indian e-Way Bill for road transit")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name} (₹{self.total_amount})"

    def recalculate_total(self):
        taxable = Decimal('0.00')
        cgst = Decimal('0.00')
        sgst = Decimal('0.00')
        igst = Decimal('0.00')

        for item in self.items.all():
            line_taxable = Decimal(item.quantity_ordered) * item.unit_cost
            rate = item.product.gst_rate / Decimal('100.00')
            tax = line_taxable * rate
            
            taxable += line_taxable
            if self.is_inter_state:
                igst += tax
            else:
                cgst += tax / Decimal('2.00')
                sgst += tax / Decimal('2.00')

        self.taxable_amount = round(taxable, 2)
        self.cgst_amount = round(cgst, 2)
        self.sgst_amount = round(sgst, 2)
        self.igst_amount = round(igst, 2)
        self.total_amount = round(taxable + cgst + sgst + igst, 2)
        self.save(update_fields=['taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount'])
        return self.total_amount

    @transaction.atomic
    def mark_as_received(self, user=None):
        """Processes PO arrival: increments product stock levels and generates StockMovement logs."""
        from django.utils import timezone
        if self.status == self.Status.RECEIVED:
            return False, "Order already received"
        
        for item in self.items.all():
            qty_to_add = item.quantity_ordered
            product = item.product
            prev_qty = product.quantity_on_hand
            new_qty = prev_qty + qty_to_add
            
            product.quantity_on_hand = new_qty
            product.save(update_fields=['quantity_on_hand', 'updated_at'])
            
            item.quantity_received = qty_to_add
            item.save(update_fields=['quantity_received'])
            
            StockMovement.objects.create(
                product=product,
                movement_type=StockMovement.MovementType.IN,
                quantity=qty_to_add,
                previous_stock=prev_qty,
                new_stock=new_qty,
                unit_price=item.unit_cost,
                reference_number=self.po_number,
                created_by=user or self.created_by,
                notes=f"Stock received under PO {self.po_number} from {self.supplier.name}"
            )

        self.status = self.Status.RECEIVED
        self.received_date = timezone.now()
        self.save(update_fields=['status', 'received_date', 'updated_at'])
        
        AuditLog.objects.create(
            user=user or self.created_by,
            action=AuditLog.Action.STATUS_CHANGE,
            model_name='PurchaseOrder',
            object_id=str(self.id),
            changes={'status': 'RECEIVED', 'po_number': self.po_number, 'amount_inr': str(self.total_amount)}
        )
        return True, "Order marked as received and warehouse inventory updated successfully."


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='po_items')
    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, help_text="Ex-factory cost in ₹")
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        self.total_cost = Decimal(self.quantity_ordered) * self.unit_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity_ordered}x {self.product.name} @ ₹{self.unit_cost}"


class SalesOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        PROCESSING = 'PROCESSING', 'Processing & Picking'
        SHIPPED = 'SHIPPED', 'Dispatched / In Transit'
        DELIVERED = 'DELIVERED', 'Delivered & Accepted'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid (Net 30/60)'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid / UPI / Razorpay'
        REFUNDED = 'REFUNDED', 'Refunded'

    so_number = models.CharField(max_length=64, unique=True, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales_orders')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=30, choices=PaymentStatus.choices, default=PaymentStatus.PAID)
    order_date = models.DateTimeField(auto_now_add=True)
    shipped_date = models.DateTimeField(null=True, blank=True)
    
    # Indian GST Breakdown
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Grand Total (₹)")
    is_inter_state = models.BooleanField(default=False)

    e_way_bill_number = models.CharField(max_length=30, blank=True, default='')
    razorpay_order_id = models.CharField(max_length=64, blank=True, default='')
    razorpay_payment_id = models.CharField(max_length=64, blank=True, default='')

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return f"{self.so_number} - {self.customer.name} (₹{self.total_amount})"

    def recalculate_total(self):
        taxable = Decimal('0.00')
        cgst = Decimal('0.00')
        sgst = Decimal('0.00')
        igst = Decimal('0.00')

        for item in self.items.all():
            sub = Decimal(item.quantity) * item.unit_price
            disc = sub * (item.discount / Decimal('100.00'))
            line_taxable = sub - disc
            
            rate = item.product.gst_rate / Decimal('100.00')
            tax = line_taxable * rate
            
            taxable += line_taxable
            if self.is_inter_state:
                igst += tax
            else:
                cgst += tax / Decimal('2.00')
                sgst += tax / Decimal('2.00')

        self.taxable_amount = round(taxable, 2)
        self.cgst_amount = round(cgst, 2)
        self.sgst_amount = round(sgst, 2)
        self.igst_amount = round(igst, 2)
        self.total_amount = round(taxable + cgst + sgst + igst, 2)
        self.save(update_fields=['taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount'])
        return self.total_amount

    @transaction.atomic
    def dispatch_and_fulfill(self, user=None):
        """Validates stock, decrements inventory, records StockMovement OUT."""
        from django.utils import timezone
        if self.status in [self.Status.SHIPPED, self.Status.DELIVERED]:
            return False, "Order already dispatched/delivered"
        
        for item in self.items.all():
            if item.product.quantity_on_hand < item.quantity:
                return False, f"Insufficient stock for {item.product.name} (Available: {item.product.quantity_on_hand}, Requested: {item.quantity})"

        for item in self.items.all():
            product = item.product
            prev_qty = product.quantity_on_hand
            new_qty = prev_qty - item.quantity
            product.quantity_on_hand = new_qty
            product.save(update_fields=['quantity_on_hand', 'updated_at'])

            StockMovement.objects.create(
                product=product,
                movement_type=StockMovement.MovementType.OUT,
                quantity=item.quantity,
                previous_stock=prev_qty,
                new_stock=new_qty,
                unit_price=item.unit_price,
                reference_number=self.so_number,
                created_by=user or self.created_by,
                notes=f"Dispatched for Indian Sales Order {self.so_number} ({self.customer.name})"
            )

        self.status = self.Status.SHIPPED
        self.shipped_date = timezone.now()
        self.save(update_fields=['status', 'shipped_date', 'updated_at'])

        AuditLog.objects.create(
            user=user or self.created_by,
            action=AuditLog.Action.STATUS_CHANGE,
            model_name='SalesOrder',
            object_id=str(self.id),
            changes={'status': 'SHIPPED', 'so_number': self.so_number, 'amount_inr': str(self.total_amount)}
        )
        return True, "Order fulfilled, stock deducted and tax invoice dispatched successfully."


class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='so_items')
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, help_text="Selling price per unit in ₹")
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00')) # % discount
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        subtotal = Decimal(self.quantity) * self.unit_price
        discount_amount = subtotal * (self.discount / Decimal('100.00'))
        self.total_price = subtotal - discount_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.product.name} @ ₹{self.unit_price}"
