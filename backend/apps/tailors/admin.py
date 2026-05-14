from django.contrib import admin

from .models import TailorProfile


@admin.register(TailorProfile)
class TailorProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "specialty", "status", "quality_score", "average_delay_days")
    list_filter = ("status", "specialty")
    search_fields = ("full_name", "phone", "specialty")

