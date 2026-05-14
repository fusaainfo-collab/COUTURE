from django.contrib import admin

from .models import MeasurementProfile, MeasurementRevision


@admin.register(MeasurementProfile)
class MeasurementProfileAdmin(admin.ModelAdmin):
    list_display = ("client", "label", "category", "is_default", "updated_at")
    list_filter = ("category", "is_default")
    search_fields = ("client__full_name", "label")


@admin.register(MeasurementRevision)
class MeasurementRevisionAdmin(admin.ModelAdmin):
    list_display = ("profile", "changed_by", "created_at")
    search_fields = ("profile__client__full_name", "changed_by__username")

