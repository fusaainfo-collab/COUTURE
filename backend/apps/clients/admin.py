from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "whatsapp", "vip_level", "is_active")
    list_filter = ("gender", "vip_level", "is_active")
    search_fields = ("full_name", "phone", "whatsapp", "email")

