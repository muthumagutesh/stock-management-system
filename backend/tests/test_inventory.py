import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import CustomUser
from apps.inventory.models import Category, Product, StockMovement, AuditLog

@pytest.mark.django_db
class TestInventory:
    def setup_method(self):
        self.client = APIClient()
        self.manager = CustomUser.objects.create_user(
            username='testmanager',
            email='manager@test.io',
            password='Password@123',
            role=CustomUser.Role.MANAGER
        )
        self.client.force_authenticate(user=self.manager)
        self.category = Category.objects.create(name='Test Category', slug='test-cat')
        self.product = Product.objects.create(
            sku='TEST-SKU-001',
            name='Test Precision Bearing',
            category=self.category,
            cost_price=Decimal('50.00'),
            selling_price=Decimal('100.00'),
            quantity_on_hand=20,
            min_stock_level=10,
            max_stock_level=100,
            unit='pcs'
        )

    def test_list_products(self):
        url = reverse('product-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1

    def test_stock_adjustment(self):
        url = reverse('product-adjust-stock', kwargs={'pk': self.product.id})
        response = self.client.post(url, {
            'product_id': self.product.id,
            'new_quantity': 35,
            'reason': 'Cycle count discrepancy correction',
            'notes': 'Verified physical shelf count'
        })
        assert response.status_code == status.HTTP_200_OK
        self.product.refresh_from_db()
        assert self.product.quantity_on_hand == 35

        # Check movement log
        movement = StockMovement.objects.filter(product=self.product).latest('timestamp')
        assert movement.movement_type == StockMovement.MovementType.ADJUSTMENT
        assert movement.previous_stock == 20
        assert movement.new_stock == 35
        assert movement.quantity == 15

    def test_low_stock_filter(self):
        # Create product with 5 items (below min_stock_level of 10)
        p_low = Product.objects.create(
            sku='LOW-SKU-002',
            name='Low Stock Item',
            category=self.category,
            cost_price=Decimal('10.00'),
            selling_price=Decimal('20.00'),
            quantity_on_hand=5,
            min_stock_level=10
        )
        url = reverse('product-low-stock')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        skus = [p['sku'] for p in response.data]
        assert 'LOW-SKU-002' in skus

    def test_bulk_upload_csv(self):
        url = reverse('product-bulk-upload')
        csv_data = (
            "sku,name,category,cost_price,selling_price,hsn_code,gst_rate,quantity,reorder_level,location,description\n"
            "BULK-SKU-999,Bulk Test Item,Test Category,500.00,850.00,8501,18,60,15,Pune Bay Z,Bulk test\n"
        )
        response = self.client.post(url, {'csv_content': csv_data}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['created'] >= 1
        p = Product.objects.get(sku='BULK-SKU-999')
        assert p.hsn_code == '8501'
        assert p.gst_rate == Decimal('18.00')

    def test_qr_code_generation(self):
        url = reverse('product-qr-code', kwargs={'pk': self.product.id})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'qr_base64' in response.data
        assert len(response.data['qr_base64']) > 100

