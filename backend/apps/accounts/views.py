from rest_framework import permissions
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

from apps.core.views import get_accessible_workshops, is_admin_user
from apps.core.models import AuditLog

from .serializers import LoginSerializer, ManagedUserSerializer, UserSerializer
from django.contrib.auth.models import User


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        AuditLog.objects.create(
            user=user,
            action=AuditLog.ACTION_LOGIN,
            entity="auth",
            entity_id=str(user.id),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ManagedUserViewSet(viewsets.ModelViewSet):
    serializer_class = ManagedUserSerializer
    search_fields = ["username", "first_name", "last_name", "email", "profile__phone"]
    ordering_fields = ["username", "date_joined", "last_login"]
    ordering = ["username"]

    def get_queryset(self):
        queryset = User.objects.select_related("profile").prefetch_related("workshop_memberships__workshop")
        if is_admin_user(self.request.user):
            return queryset.order_by("username")
        workshop_ids = get_accessible_workshops(self.request.user).values_list("id", flat=True)
        return queryset.filter(workshop_memberships__workshop_id__in=workshop_ids).distinct().order_by("username")
