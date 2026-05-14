from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import LoginView, ManagedUserViewSet, MeView

router = DefaultRouter()
router.register("users", ManagedUserViewSet, basename="users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
] + router.urls
