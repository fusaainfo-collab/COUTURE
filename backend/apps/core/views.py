from django.utils import timezone
from django.db.models import Prefetch, Q
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from .models import AuditLog, MessageThread, ThreadMessage, Workshop, WorkshopMembership
from .serializers import MessageThreadSerializer, ThreadMessageSerializer, WorkshopSerializer


def get_default_workshop():
    workshop, _ = Workshop.objects.get_or_create(
        slug="atelier-principal",
        defaults={
            "name": "Atelier Principal",
            "currency": "XOF",
        },
    )
    return workshop


def get_user_role(user):
    if is_admin_user(user):
        return "admin"
    return getattr(getattr(user, "profile", None), "role", "manager")


def get_accessible_workshops(user):
    if user is None or not user.is_authenticated:
        return Workshop.objects.none()
    if is_admin_user(user):
        return Workshop.objects.filter(is_active=True)

    membership_workshops = Workshop.objects.filter(memberships__user=user, memberships__is_active=True, is_active=True)
    tailor_workshops = Workshop.objects.none()
    tailor_profile = getattr(user, "tailor_profile", None)
    if tailor_profile is not None and getattr(tailor_profile, "workshop_id", None):
        tailor_workshops = Workshop.objects.filter(id=tailor_profile.workshop_id, is_active=True)
    client_workshops = Workshop.objects.filter(clients_client_items__user=user, clients_client_items__is_deleted=False, is_active=True)
    return (membership_workshops | tailor_workshops | client_workshops).distinct().order_by("name")


def user_has_workshop_access(user, workshop):
    if workshop is None:
        return False
    if is_admin_user(user):
        return True
    return get_accessible_workshops(user).filter(id=workshop.id).exists()


def user_has_workshop_role(user, workshop, roles):
    if workshop is None:
        return False
    if is_admin_user(user):
        return True
    if isinstance(roles, str):
        roles = [roles]
    return WorkshopMembership.objects.filter(
        user=user,
        workshop=workshop,
        role__in=roles,
        is_active=True,
    ).exists()


def get_request_workshop(request):
    user = getattr(request, "user", None)
    accessible_workshops = get_accessible_workshops(user)
    header_value = request.headers.get("X-Workshop-ID") if request else None
    if header_value:
        try:
            workshop = Workshop.objects.get(id=header_value, is_active=True)
        except (Workshop.DoesNotExist, ValueError):
            return None
        return workshop if user_has_workshop_access(user, workshop) else None
    first_accessible = accessible_workshops.first()
    if first_accessible:
        return first_accessible
    if is_admin_user(user):
        return get_default_workshop()
    return None


def is_admin_user(user):
    if user is None or not user.is_authenticated:
        return False
    profile = getattr(user, "profile", None)
    return bool(user.is_superuser or getattr(profile, "role", None) == "admin")


class AdminCanWriteWorkshopPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_admin_user(request.user)


class WorkshopViewSet(viewsets.ModelViewSet):
    serializer_class = WorkshopSerializer
    permission_classes = [AdminCanWriteWorkshopPermission]
    search_fields = ["name", "slug", "phone", "address"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        user = self.request.user
        membership_prefetch = Prefetch(
            "memberships",
            queryset=WorkshopMembership.objects.filter(user=user, is_active=True),
            to_attr="user_membership",
        )
        return get_accessible_workshops(user).prefetch_related(membership_prefetch).order_by("name")


class SoftDeleteModelViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = super().get_queryset()
        model = getattr(queryset, "model", None)
        if model is not None and hasattr(model, "is_deleted"):
            return queryset.filter(is_deleted=False)
        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        model = getattr(queryset, "model", None)
        if model is not None and hasattr(model, "workshop_id"):
            workshop = get_request_workshop(getattr(self, "request", None))
            if workshop is None:
                return queryset.none()
            queryset = queryset.filter(workshop=workshop)
            return self._scope_queryset_for_role(queryset)
        return queryset

    def perform_create(self, serializer):
        kwargs = {}
        model = getattr(serializer.Meta, "model", None)
        if model is not None and hasattr(model, "workshop_id"):
            workshop = get_request_workshop(getattr(self, "request", None))
            if workshop is None:
                raise PermissionDenied("Aucun atelier autorise pour cet utilisateur.")
            if not user_has_workshop_role(getattr(self.request, "user", None), workshop, ["manager"]):
                raise PermissionDenied("Seul l'admin ou le gerant de cet atelier peut creer cet element.")
            kwargs["workshop"] = workshop
        instance = serializer.save(**kwargs)
        self._audit(AuditLog.ACTION_CREATED, instance)

    def perform_update(self, serializer):
        target = self.get_object()
        workshop = getattr(target, "workshop", None)
        if workshop is not None and not user_has_workshop_role(getattr(self.request, "user", None), workshop, ["manager"]):
            raise PermissionDenied("Modification reservee a l'admin ou au gerant de cet atelier.")
        instance = serializer.save()
        self._audit(AuditLog.ACTION_UPDATED, instance)

    def perform_destroy(self, instance):
        workshop = getattr(instance, "workshop", None)
        if workshop is not None and not user_has_workshop_role(getattr(self.request, "user", None), workshop, ["manager"]):
            raise PermissionDenied("Suppression reservee a l'admin ou au gerant de cet atelier.")
        if hasattr(instance, "is_deleted"):
            instance.is_deleted = True
            instance.deleted_at = timezone.now()
            instance.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
            self._audit(AuditLog.ACTION_DELETED, instance)
            return
        super().perform_destroy(instance)
        self._audit(AuditLog.ACTION_DELETED, instance)

    def _audit(self, action, instance):
        request = getattr(self, "request", None)
        user = getattr(request, "user", None)
        if user is not None and not user.is_authenticated:
            user = None
        AuditLog.objects.create(
            user=user,
            action=action,
            entity=instance.__class__.__name__,
            entity_id=str(getattr(instance, "pk", "")),
            ip_address=request.META.get("REMOTE_ADDR") if request else None,
        )

    def _scope_queryset_for_role(self, queryset):
        request = getattr(self, "request", None)
        user = getattr(request, "user", None)
        role = get_user_role(user)
        model = getattr(queryset, "model", None)
        if model is None or role in ["admin", "manager"]:
            return queryset

        label = model._meta.label_lower
        if role == "client":
            if label == "orders.pattern":
                return queryset
            if label == "clients.client":
                return queryset.filter(user=user)
            if label == "orders.order":
                return queryset.filter(client__user=user)
            if label == "payments.payment":
                return queryset.filter(client__user=user)
            if label == "measurements.measurementprofile":
                return queryset.filter(client__user=user)
            if label == "appointments.appointment":
                return queryset.filter(client__user=user)
            return queryset.none()

        if role == "tailor":
            if label == "orders.pattern":
                return queryset
            if label == "tailors.tailorprofile":
                return queryset.filter(user=user)
            if label == "orders.order":
                return queryset.filter(assigned_tailor__user=user)
            if label == "appointments.appointment":
                return queryset.filter(tailor__user=user)
            if label == "clients.client":
                return queryset.filter(orders__assigned_tailor__user=user).distinct()
            if label == "measurements.measurementprofile":
                return queryset.filter(client__orders__assigned_tailor__user=user).distinct()
            return queryset.none()

        return queryset.none()


class MessageThreadViewSet(viewsets.ModelViewSet):
    serializer_class = MessageThreadSerializer
    search_fields = ["subject", "messages__body", "client__username", "client__first_name", "client__last_name"]
    ordering_fields = ["last_message_at", "created_at", "priority", "status"]
    ordering = ["-last_message_at", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        queryset = MessageThread.objects.select_related("workshop", "client").prefetch_related("messages__sender")
        if role == "admin":
            return queryset
        workshop = get_request_workshop(self.request)
        if workshop is None:
            return queryset.none()
        queryset = queryset.filter(workshop=workshop)
        if role == "client":
            return queryset.filter(client=user)
        if role == "manager":
            return queryset
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        workshop = get_request_workshop(self.request)
        if workshop is None:
            raise PermissionDenied("Aucun atelier autorise pour ce message.")

        client = serializer.validated_data.get("client")
        if role == "client":
            client = user
        elif role != "admin" and not user_has_workshop_role(user, workshop, ["manager"]):
            raise PermissionDenied("Message reserve au client, a l'admin ou au gerant de l'atelier.")
        elif client and not user_has_workshop_role(client, workshop, ["client"]):
            raise PermissionDenied("Ce client n'est pas lie a cet atelier.")

        initial_message = serializer.validated_data.pop("initial_message", "")
        thread = serializer.save(workshop=workshop, client=client, last_message_at=timezone.now())
        if initial_message.strip():
            ThreadMessage.objects.create(thread=thread, sender=user, body=initial_message.strip())

    @action(detail=True, methods=["post"], url_path="repondre")
    def reply(self, request, pk=None):
        thread = self.get_object()
        body = str(request.data.get("body", "")).strip()
        if not body:
            raise PermissionDenied("Le message ne peut pas etre vide.")
        message = ThreadMessage.objects.create(thread=thread, sender=request.user, body=body)
        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        return Response(ThreadMessageSerializer(message, context={"request": request}).data)
