from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from django.utils.text import slugify

from apps.accounts.models import UserProfile

from .models import MessageThread, ThreadMessage, Workshop, WorkshopMembership


class WorkshopManagerCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Identifiant obligatoire.")
        try:
            UnicodeUsernameValidator()(username)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Cet identifiant est deja utilise.")
        return username

    def validate(self, attrs):
        full_name = attrs.get("full_name", "").strip()
        first_name = attrs.get("first_name", "").strip()
        last_name = attrs.get("last_name", "").strip()

        if full_name and not first_name and not last_name:
            name_parts = full_name.split()
            first_name = name_parts[0]
            last_name = " ".join(name_parts[1:])

        if not first_name and not last_name:
            first_name = attrs["username"]

        attrs["full_name"] = full_name
        attrs["first_name"] = first_name
        attrs["last_name"] = last_name
        attrs["email"] = attrs.get("email", "").strip()
        attrs["phone"] = attrs.get("phone", "").strip()
        return attrs


class WorkshopSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    manager = WorkshopManagerCreateSerializer(write_only=True, required=False, allow_null=True)
    primary_manager = serializers.SerializerMethodField()

    class Meta:
        model = Workshop
        fields = [
            "id",
            "name",
            "slug",
            "phone",
            "address",
            "currency",
            "is_active",
            "role",
            "manager",
            "primary_manager",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "primary_manager"]
        extra_kwargs = {"slug": {"required": False}}

    def validate_slug(self, value):
        return slugify(value) or value

    @transaction.atomic
    def create(self, validated_data):
        manager_data = validated_data.pop("manager", None)
        if not validated_data.get("slug"):
            base_slug = slugify(validated_data.get("name", "atelier")) or "atelier"
            slug = base_slug
            index = 2
            while Workshop.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{index}"
                index += 1
            validated_data["slug"] = slug
        workshop = super().create(validated_data)
        if manager_data:
            self._create_manager(workshop, manager_data)
        return workshop

    @transaction.atomic
    def update(self, instance, validated_data):
        manager_data = validated_data.pop("manager", None)
        workshop = super().update(instance, validated_data)
        if manager_data:
            self._create_manager(workshop, manager_data)
        return workshop

    def get_role(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None
        if user.is_superuser or getattr(getattr(user, "profile", None), "role", None) == "admin":
            return "admin"
        membership = getattr(obj, "user_membership", None)
        if membership:
            return membership[0].role if membership else None
        found = obj.memberships.filter(user=user, is_active=True).first()
        return found.role if found else None

    def get_primary_manager(self, obj):
        membership = (
            obj.memberships.select_related("user__profile")
            .filter(role=WorkshopMembership.ROLE_MANAGER, is_active=True, user__is_active=True)
            .order_by("created_at")
            .first()
        )
        if not membership:
            return None
        user = membership.user
        profile = getattr(user, "profile", None)
        return {
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "email": user.email,
            "phone": getattr(profile, "phone", ""),
        }

    def _create_manager(self, workshop, manager_data):
        password = manager_data.pop("password")
        phone = manager_data.pop("phone", "")
        manager_data.pop("full_name", None)
        user = User(
            username=manager_data["username"],
            email=manager_data.get("email", ""),
            first_name=manager_data.get("first_name", ""),
            last_name=manager_data.get("last_name", ""),
            is_active=manager_data.get("is_active", True),
            is_staff=False,
            is_superuser=False,
        )
        user.set_password(password)
        user.save()
        UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": UserProfile.ROLE_MANAGER, "phone": phone},
        )
        WorkshopMembership.objects.update_or_create(
            user=user,
            workshop=workshop,
            defaults={"role": WorkshopMembership.ROLE_MANAGER, "is_active": True},
        )
        return user


class WorkshopMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    workshop_name = serializers.CharField(source="workshop.name", read_only=True)

    class Meta:
        model = WorkshopMembership
        fields = [
            "id",
            "workshop",
            "workshop_name",
            "user",
            "username",
            "full_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ThreadMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = ThreadMessage
        fields = [
            "id",
            "thread",
            "sender",
            "sender_name",
            "sender_role",
            "body",
            "is_internal",
            "read_by_client",
            "read_by_workshop",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "sender",
            "read_by_client",
            "read_by_workshop",
            "created_at",
            "updated_at",
        ]

    def get_sender_name(self, obj):
        if not obj.sender:
            return "Systeme"
        return obj.sender.get_full_name() or obj.sender.username

    def get_sender_role(self, obj):
        if not obj.sender:
            return "system"
        return getattr(getattr(obj.sender, "profile", None), "role", "manager")


class MessageThreadSerializer(serializers.ModelSerializer):
    workshop_name = serializers.CharField(source="workshop.name", read_only=True)
    client_name = serializers.SerializerMethodField()
    messages = ThreadMessageSerializer(many=True, read_only=True)
    initial_message = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "workshop",
            "workshop_name",
            "client",
            "client_name",
            "subject",
            "priority",
            "status",
            "last_message_at",
            "initial_message",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["workshop", "last_message_at", "created_at", "updated_at", "messages"]

    def get_client_name(self, obj):
        if not obj.client:
            return "Client non lie"
        return obj.client.get_full_name() or obj.client.username
