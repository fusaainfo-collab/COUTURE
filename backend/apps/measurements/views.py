from apps.core.views import SoftDeleteModelViewSet

from .models import MeasurementProfile
from .serializers import MeasurementProfileSerializer


class MeasurementProfileViewSet(SoftDeleteModelViewSet):
    serializer_class = MeasurementProfileSerializer
    search_fields = ["client__full_name", "label", "category", "notes"]
    ordering_fields = ["created_at", "updated_at", "label"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return MeasurementProfile.objects.filter(is_deleted=False).select_related("client")

