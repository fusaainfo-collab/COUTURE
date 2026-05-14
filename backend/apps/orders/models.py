from decimal import Decimal
from uuid import uuid4

from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel, TimeStampedModel


class Pattern(SoftDeleteModel):
    CATEGORY_CHOICES = [
        ("bazin", "Bazin"),
        ("costume", "Costume"),
        ("robe", "Robe"),
        ("kaftan", "Kaftan"),
        ("boubou", "Boubou"),
        ("uniforme", "Uniforme"),
        ("mariage", "Mariage"),
        ("luxe", "Luxe"),
        ("casual", "Casual"),
        ("africain_moderne", "Africain moderne"),
    ]

    name = models.CharField(max_length=160)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    image = models.ImageField(upload_to="patterns/", null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    is_favorite = models.BooleanField(default=False)
    trend_score = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


class Order(SoftDeleteModel):
    STATUS_PENDING = "pending"
    STATUS_CUTTING = "cutting"
    STATUS_SEWING = "sewing"
    STATUS_FINISHING = "finishing"
    STATUS_READY = "ready"
    STATUS_DELIVERED = "delivered"
    STATUS_LATE = "late"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "En attente"),
        (STATUS_CUTTING, "Decoupe"),
        (STATUS_SEWING, "Couture"),
        (STATUS_FINISHING, "Finition"),
        (STATUS_READY, "Pret"),
        (STATUS_DELIVERED, "Livre"),
        (STATUS_LATE, "Retard"),
        (STATUS_CANCELLED, "Annule"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Basse"),
        ("normal", "Normale"),
        ("high", "Haute"),
        ("urgent", "Urgente"),
    ]

    code = models.CharField(max_length=32, unique=True, blank=True)
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="orders")
    measurement_profile = models.ForeignKey(
        "measurements.MeasurementProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    pattern = models.ForeignKey(
        Pattern,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    fabric = models.CharField(max_length=140, blank=True)
    color = models.CharField(max_length=80, blank=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    advance_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deposit_date = models.DateField(default=timezone.localdate)
    delivery_date = models.DateField()
    assigned_tailor = models.ForeignKey(
        "tailors.TailorProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default="normal")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_PENDING)
    progress = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["delivery_date", "-created_at"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["status"]),
            models.Index(fields=["delivery_date"]),
            models.Index(fields=["priority"]),
        ]

    def __str__(self):
        return self.code or f"Commande #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"CMD-{timezone.localdate():%Y%m%d}-{uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @property
    def amount_paid(self):
        paid_payments = self.payments.filter(status="paid").aggregate(total=models.Sum("amount"))["total"]
        return (paid_payments or Decimal("0")) + (self.advance_paid or Decimal("0"))

    @property
    def balance_due(self):
        return max(Decimal("0"), self.total_price - self.amount_paid)

    @property
    def is_overdue(self):
        return self.delivery_date < timezone.localdate() and self.status not in [
            self.STATUS_DELIVERED,
            self.STATUS_CANCELLED,
        ]


class OrderEvent(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=24, blank=True)
    actor = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order.code} - {self.title}"

