from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import SoftDeleteModelViewSet

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(SoftDeleteModelViewSet):
    serializer_class = NotificationSerializer
    search_fields = ["title", "message", "notification_type", "channel", "priority", "status"]
    ordering_fields = ["created_at", "priority", "status", "notification_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Notification.objects.filter(is_deleted=False)

    @action(detail=True, methods=["post"], url_path="marquer-lue")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_read()
        return Response(self.get_serializer(notification).data)

