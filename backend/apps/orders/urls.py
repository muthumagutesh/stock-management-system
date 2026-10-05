from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, CustomerViewSet, PurchaseOrderViewSet, SalesOrderViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'purchases', PurchaseOrderViewSet, basename='purchase')
router.register(r'sales', SalesOrderViewSet, basename='sale')

urlpatterns = [
    path('', include(router.urls)),
]
