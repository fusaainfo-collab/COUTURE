from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("title", "client", "tailor", "appointment_type", "priority", "status", "start_at")
    list_filter = ("appointment_type", "priority", "status", "start_at")
    search_fields = ("title", "client__full_name", "client__phone", "tailor__full_name", "notes")

