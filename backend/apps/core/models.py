from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Workshop(TimeStampedModel):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    currency = models.CharField(max_length=8, default="XOF")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class WorkshopMembership(TimeStampedModel):
    ROLE_MANAGER = "manager"
    ROLE_TAILOR = "tailor"
    ROLE_CLIENT = "client"

    ROLE_CHOICES = [
        (ROLE_MANAGER, "Gerant"),
        (ROLE_TAILOR, "Tailleur"),
        (ROLE_CLIENT, "Client"),
    ]

    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workshop_memberships")
    role = models.CharField(max_length=24, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["workshop__name", "role", "user__username"]
        constraints = [
            models.UniqueConstraint(fields=["workshop", "user"], name="unique_user_workshop_membership"),
        ]

    def __str__(self):
        return f"{self.user} - {self.workshop} ({self.role})"


class SoftDeleteModel(TimeStampedModel):
    workshop = models.ForeignKey(
        "core.Workshop",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_items",
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class AuditLog(TimeStampedModel):
    ACTION_CREATED = "created"
    ACTION_UPDATED = "updated"
    ACTION_DELETED = "deleted"
    ACTION_LOGIN = "login"

    ACTION_CHOICES = [
        (ACTION_CREATED, "Creation"),
        (ACTION_UPDATED, "Modification"),
        (ACTION_DELETED, "Suppression"),
        (ACTION_LOGIN, "Connexion"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    entity = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.entity} #{self.entity_id}"


class MessageThread(TimeStampedModel):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Ouvert"),
        (STATUS_CLOSED, "Ferme"),
        (STATUS_ARCHIVED, "Archive"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Basse"),
        ("normal", "Normale"),
        ("high", "Haute"),
        ("urgent", "Urgente"),
    ]

    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="message_threads")
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="client_message_threads",
    )
    subject = models.CharField(max_length=180)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default="normal")
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.subject


class ThreadMessage(TimeStampedModel):
    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_thread_messages",
    )
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    read_by_client = models.BooleanField(default=False)
    read_by_workshop = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.thread_id} - {self.sender_id}"
