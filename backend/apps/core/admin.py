from django.contrib import admin

from .models import AuditLog, MessageThread, ThreadMessage, Workshop, WorkshopMembership


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "phone", "currency", "is_active", "updated_at")
    list_filter = ("is_active", "currency")
    search_fields = ("name", "slug", "phone", "address")


@admin.register(WorkshopMembership)
class WorkshopMembershipAdmin(admin.ModelAdmin):
    list_display = ("workshop", "user", "role", "is_active", "created_at")
    list_filter = ("role", "is_active", "workshop")
    search_fields = ("workshop__name", "user__username", "user__first_name", "user__last_name")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity", "entity_id", "user", "created_at")
    list_filter = ("action", "entity", "created_at")
    search_fields = ("entity", "entity_id", "user__username")


class ThreadMessageInline(admin.TabularInline):
    model = ThreadMessage
    extra = 0


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    list_display = ("subject", "workshop", "client", "priority", "status", "last_message_at")
    list_filter = ("priority", "status", "workshop")
    search_fields = ("subject", "client__username", "messages__body")
    inlines = [ThreadMessageInline]
