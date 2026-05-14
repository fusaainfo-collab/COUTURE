from apps.core.views import SoftDeleteModelViewSet

from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(SoftDeleteModelViewSet):
    serializer_class = AppointmentSerializer
    search_fields = [
        "client__full_name",
        "client__phone",
        "tailor__full_name",
        "title",
        "appointment_type",
        "notes",
    ]
    ordering_fields = ["start_at", "end_at", "priority", "status", "created_at"]
    ordering = ["start_at"]

    def get_queryset(self):
        return Appointment.objects.filter(is_deleted=False).select_related("client", "tailor")

