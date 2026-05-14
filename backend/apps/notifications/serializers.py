from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "channel",
            "priority",
            "status",
            "target_url",
            "read_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

