from django.urls import path
from .views import (
    DashboardKPIView, DemandForecastListView,
    RunForecastBatchView, QuickReorderView,
    CompanySettingsView, SupplierReliabilityView,
    ExportCSVView, ExportExcelView, ExportPDFView
)

urlpatterns = [
    path('dashboard/', DashboardKPIView.as_view(), name='dashboard-kpi'),
    path('forecasts/', DemandForecastListView.as_view(), name='forecasts-list'),
    path('forecasts/run/', RunForecastBatchView.as_view(), name='forecasts-run'),
    path('reorder/quick-po/', QuickReorderView.as_view(), name='reorder-quick-po'),
    path('settings/', CompanySettingsView.as_view(), name='company-settings'),
    path('suppliers/reliability/', SupplierReliabilityView.as_view(), name='supplier-reliability'),
    path('export/csv/', ExportCSVView.as_view(), name='export-csv'),
    path('export/excel/', ExportExcelView.as_view(), name='export-excel'),
    path('export/pdf/', ExportPDFView.as_view(), name='export-pdf'),
]
