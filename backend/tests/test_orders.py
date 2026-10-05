import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import CustomUser
from apps.inventory.models import Category, Product, StockMovement
from apps.orders.models import Supplier, Customer, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem

@pytest.mark.django_db
class TestOrders:
    def setup_method(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            username='admin_test',
            email='admin@test.io',
            password='AdminPassword@123',
            role=CustomUser.Role.ADMIN
        )
        self.client.force_authenticate(user=self.admin)
        self.category = Category.objects.create(name='Motors', slug='motors')
        self.product = Product.objects.create(
            sku='MTR-100',
            name='Precision Stepper Motor',
            category=self.category,
            cost_price=Decimal('40.00'),
            selling_price=Decimal('85.00'),
            quantity_on_hand=50,
            min_stock_level=15
        )
        self.supplier = Supplier.objects.create(name='Alpha Motors Inc')
        self.customer = Customer.objects.create(name='RoboTech Industries')

    def test_purchase_order_flow_and_receive(self):
        po = PurchaseOrder.objects.create(
            po_number='PO-TEST-001',
            supplier=self.supplier,
            status=PurchaseOrder.Status.ORDERED,
            created_by=self.admin
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product,
            quantity_ordered=25,
            unit_cost=Decimal('40.00')
        )
        po.recalculate_total()
        assert po.taxable_amount == Decimal('1000.00')
        assert po.total_amount == Decimal('1180.00') # 1000 + 18% GST

        # Receive PO
        url = reverse('purchase-receive', kwargs={'pk': po.id})
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK

        self.product.refresh_from_db()
        assert self.product.quantity_on_hand == 75 # 50 + 25
        po.refresh_from_db()
        assert po.status == PurchaseOrder.Status.RECEIVED

    def test_sales_order_dispatch_stock_decrement(self):
        so = SalesOrder.objects.create(
            so_number='SO-TEST-001',
            customer=self.customer,
            status=SalesOrder.Status.PROCESSING,
            created_by=self.admin
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product,
            quantity=10,
            unit_price=Decimal('85.00')
        )
        so.recalculate_total()

        # Fulfill & Dispatch SO
        url = reverse('sale-fulfill', kwargs={'pk': so.id})
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK

        self.product.refresh_from_db()
        assert self.product.quantity_on_hand == 40 # 50 - 10
        so.refresh_from_db()
        assert so.status == SalesOrder.Status.SHIPPED

    def test_sales_order_insufficient_stock_fails(self):
        so = SalesOrder.objects.create(
            so_number='SO-TEST-002',
            customer=self.customer,
            status=SalesOrder.Status.PROCESSING,
            created_by=self.admin
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product,
            quantity=999, # Excess quantity
            unit_price=Decimal('85.00')
        )
        so.recalculate_total()

        url = reverse('sale-fulfill', kwargs={'pk': so.id})
        response = self.client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Insufficient stock" in response.data['message']
