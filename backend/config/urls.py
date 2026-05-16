from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from apps.analytics.views import StatisticItemViewSet
from apps.appointments.views import AppointmentViewSet
from apps.clients.views import ClientViewSet
from apps.core.views import MessageThreadViewSet, WorkshopViewSet
from apps.measurements.views import MeasurementProfileViewSet
from apps.notifications.views import NotificationViewSet
from apps.orders.views import OrderEventViewSet, OrderViewSet, PatternViewSet
from apps.payments.views import ExpenseViewSet, PaymentViewSet
from apps.tailors.views import TailorProfileViewSet

router = DefaultRouter()
router.register("workshops", WorkshopViewSet, basename="workshops")
router.register("messages", MessageThreadViewSet, basename="messages")
router.register("clients", ClientViewSet, basename="clients")
router.register("mesures", MeasurementProfileViewSet, basename="mesures")
router.register("rendez-vous", AppointmentViewSet, basename="rendez-vous")
router.register("statistiques", StatisticItemViewSet, basename="statistiques")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("modeles", PatternViewSet, basename="modeles")
router.register("commandes", OrderViewSet, basename="commandes")
router.register("evenements-commandes", OrderEventViewSet, basename="evenements-commandes")
router.register("paiements", PaymentViewSet, basename="paiements")
router.register("depenses", ExpenseViewSet, basename="depenses")
router.register("tailleurs", TailorProfileViewSet, basename="tailleurs")


@api_view(["GET", "HEAD"])
@permission_classes([AllowAny])
def api_v1_health(request):
    return Response({"status": "ok", "api": "v1"})


urlpatterns = [
    path("", api_v1_health, name="api-root-health"),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    re_path(r"^api/v1/?$", api_v1_health, name="api-v1-health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/", include(router.urls)),
]

if not getattr(settings, "CLOUDINARY_STORAGE_ENABLED", False) and settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
