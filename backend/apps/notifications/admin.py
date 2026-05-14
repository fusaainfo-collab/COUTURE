from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "notification_type", "channel", "priority", "status", "created_at")
    list_filter = ("notification_type", "channel", "priority", "status")
    search_fields = ("title", "message")

