import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import CustomUser
from apps.inventory.models import Category, Product
from apps.analytics.forecasting import calculate_product_forecast, run_full_inventory_forecast

@pytest.mark.django_db
class TestForecasting:
    def setup_method(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            username='admin_fc',
            email='admin_fc@test.io',
            password='AdminPassword@123',
            role=CustomUser.Role.ADMIN
        )
        self.client.force_authenticate(user=self.admin)
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.product = Product.objects.create(
            sku='ELEC-001',
            name='Precision Resistor Array',
            category=self.category,
            cost_price=Decimal('5.00'),
            selling_price=Decimal('12.00'),
            quantity_on_hand=3, # Low stock
            min_stock_level=20,
            reorder_quantity=50
        )

    def test_forecast_calculation(self):
        forecast = calculate_product_forecast(self.product)
        assert forecast.product == self.product
        assert forecast.days_until_stockout <= 5
        assert forecast.stockout_risk_level in ['CRITICAL', 'HIGH']
        assert forecast.recommended_reorder_qty >= 50

    def test_run_forecast_api(self):
        url = reverse('forecasts-run')
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'total_products_evaluated' in response.data['details']

    def test_dashboard_kpis_api(self):
        url = reverse('dashboard-kpi')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'kpis' in response.data
        assert 'stock_health' in response.data
        assert 'monthly_trends' in response.data

    def test_supplier_reliability_api(self):
        url = reverse('supplier-reliability')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_settings_api(self):
        url = reverse('company-settings')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['currency'] == 'INR'
        assert '27AAACA9999P1Z8' in response.data['gstin']

