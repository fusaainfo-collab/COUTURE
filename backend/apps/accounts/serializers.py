from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from apps.core.models import Workshop, WorkshopMembership
from apps.core.views import get_accessible_workshops, get_request_workshop, is_admin_user

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["role", "phone", "avatar", "is_available"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_staff",
            "is_superuser",
            "profile",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs.get("username"),
            password=attrs.get("password"),
        )
        if not user:
            raise serializers.ValidationError("Identifiants invalides.")
        if not user.is_active:
            raise serializers.ValidationError("Compte desactive.")
        attrs["user"] = user
        return attrs


class ManagedUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, write_only=True)
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    workshop_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    workshops = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "phone",
            "profile",
            "workshop_ids",
            "workshops",
        ]
        read_only_fields = ["is_staff", "is_superuser", "profile", "workshops"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_workshops(self, obj):
        memberships = obj.workshop_memberships.select_related("workshop").filter(is_active=True)
        return [
            {
                "id": membership.workshop_id,
                "name": membership.workshop.name,
                "role": membership.role,
            }
            for membership in memberships
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        role = attrs.get("role")
        if role == UserProfile.ROLE_ADMIN and not is_admin_user(getattr(request, "user", None)):
            raise serializers.ValidationError("Seul l'admin peut creer un administrateur.")
        if not is_admin_user(getattr(request, "user", None)) and role not in [UserProfile.ROLE_TAILOR, UserProfile.ROLE_CLIENT]:
            raise serializers.ValidationError("Le gerant peut creer seulement des tailleurs et des clients.")

        workshop_ids = attrs.get("workshop_ids")
        if not workshop_ids:
            workshop = get_request_workshop(request)
            attrs["workshop_ids"] = [workshop.id] if workshop else []

        allowed_ids = set(get_accessible_workshops(getattr(request, "user", None)).values_list("id", flat=True))
        requested_ids = set(attrs.get("workshop_ids", []))
        if requested_ids and not requested_ids.issubset(allowed_ids):
            raise serializers.ValidationError("Atelier non autorise pour cet utilisateur.")
        if role != UserProfile.ROLE_ADMIN and not requested_ids:
            raise serializers.ValidationError("Choisissez au moins un atelier.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        role = validated_data.pop("role")
        phone = validated_data.pop("phone", "")
        workshop_ids = validated_data.pop("workshop_ids", [])
        password = validated_data.pop("password", "")

        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=validated_data.get("is_active", True),
            is_staff=role == UserProfile.ROLE_ADMIN,
            is_superuser=role == UserProfile.ROLE_ADMIN,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": role, "phone": phone},
        )
        membership_role = role if role in [UserProfile.ROLE_MANAGER, UserProfile.ROLE_TAILOR, UserProfile.ROLE_CLIENT] else None
        if membership_role:
            for workshop in Workshop.objects.filter(id__in=workshop_ids):
                WorkshopMembership.objects.update_or_create(
                    user=user,
                    workshop=workshop,
                    defaults={"role": membership_role, "is_active": True},
                )
        return user
