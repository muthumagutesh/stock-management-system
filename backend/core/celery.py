import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Automated cron tasks for stock forecasts and alerts
app.conf.beat_schedule = {
    'run-demand-forecast-every-night': {
        'task': 'apps.analytics.tasks.run_nightly_forecast',
        'schedule': crontab(hour=2, minute=0), # 2:00 AM daily
    },
    'check-low-stock-hourly': {
        'task': 'apps.inventory.tasks.check_low_stock_levels',
        'schedule': crontab(minute=0), # Every hour
    }
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
