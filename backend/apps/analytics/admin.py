from django.contrib import admin

from .models import StatisticItem


@admin.register(StatisticItem)
class StatisticItemAdmin(admin.ModelAdmin):
    list_display = ("label", "value", "evolution", "impact", "tone", "updated_at")
    list_filter = ("impact", "tone")
    search_fields = ("label", "value", "notes")

