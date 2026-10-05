from rest_framework import serializers
from .models import SystemNotification

class SystemNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemNotification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'severity', 'is_read', 'target_role', 'related_link',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
