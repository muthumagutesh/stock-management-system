import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'System Administrator'
        MANAGER = 'MANAGER', 'Inventory Manager'
        STAFF = 'STAFF', 'Warehouse Staff'
        VIEWER = 'VIEWER', 'Auditor / Viewer'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="+91 Indian phone number")
    avatar = models.URLField(blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, default='Operations')
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=64, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def is_manager(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser

    @property
    def is_staff_member(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER, self.Role.STAFF] or self.is_superuser

    @property
    def is_viewer(self):
        return self.role == self.Role.VIEWER

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class APIKey(models.Model):
    """API Keys for external integrations (Tally ERP, Zoho, e-Way Bill, logistics partners)."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="e.g. Tally Prime Sync / Mobile Scanner")
    key = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = f"apex_in_{secrets.token_hex(24)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.user.username})"
