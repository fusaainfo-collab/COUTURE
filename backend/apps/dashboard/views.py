from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.core.views import get_request_workshop, is_admin_user
from apps.orders.models import Order, OrderEvent, Pattern
from apps.payments.models import Expense, Payment
from apps.tailors.models import TailorProfile


ACTIVE_ORDER_EXCLUDED_STATUSES = ["delivered", "cancelled"]
DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]


def get_user_role(user):
    if is_admin_user(user):
        return "admin"
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", "manager") or "manager"


def empty_queryset(model):
    return model.objects.none()


def get_client_for_user(user, clients):
    profile = getattr(user, "profile", None)
    profile_phone = (getattr(profile, "phone", "") or "").strip()
    username = (getattr(user, "username", "") or "").strip()
    email = (getattr(user, "email", "") or "").strip()

    conditions = []
    if email:
        conditions.append(Q(email__iexact=email))
    if profile_phone:
        conditions.append(Q(phone=profile_phone) | Q(whatsapp=profile_phone))
    if username:
        conditions.append(Q(phone=username) | Q(whatsapp=username))

    if not conditions:
        return None

    query = conditions[0]
    for condition in conditions[1:]:
        query |= condition
    return clients.filter(query).first()


def paid_amount_expression():
    return Coalesce(
        Sum("payments__amount", filter=Q(payments__status="paid")),
        Value(Decimal("0")),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )


def get_balance_due_total(orders):
    total = Decimal("0")
    rows = orders.exclude(status="cancelled").annotate(paid_total=paid_amount_expression()).values(
        "total_price",
        "advance_paid",
        "paid_total",
    )
    for row in rows:
        order_total = row["total_price"] or Decimal("0")
        advance = row["advance_paid"] or Decimal("0")
        paid = row["paid_total"] or Decimal("0")
        credited = max(advance, paid)
        total += max(Decimal("0"), order_total - credited)
    return total


def get_incomplete_payment_count(orders):
    rows = orders.exclude(status="cancelled").annotate(paid_total=paid_amount_expression()).values(
        "total_price",
        "advance_paid",
        "paid_total",
    )
    count = 0
    for row in rows:
        order_total = row["total_price"] or Decimal("0")
        advance = row["advance_paid"] or Decimal("0")
        paid = row["paid_total"] or Decimal("0")
        if order_total > max(advance, paid):
            count += 1
    return count


def build_scope(role, workshop):
    role_labels = {
        "admin": "Administrateur",
        "manager": "Gerant",
        "tailor": "Tailleur",
        "client": "Client",
    }
    title_by_role = {
        "admin": "Dashboard admin",
        "manager": "Dashboard atelier",
        "tailor": "Dashboard tailleur",
        "client": "Mon dashboard",
    }
    subtitle_by_role = {
        "admin": "Vue globale de tous les ateliers, finances, clients, commandes et production.",
        "manager": "Vue de l'atelier actif avec commandes, caisse, clients et production.",
        "tailor": "Vue limitee aux commandes assignees, echeances et activite de production.",
        "client": "Vue limitee a vos commandes, echeances et paiements.",
    }

    return {
        "role": role,
        "role_label": role_labels.get(role, "Utilisateur"),
        "workshop": workshop.name if workshop else "Tous les ateliers",
        "title": title_by_role.get(role, "Dashboard intelligent"),
        "subtitle": subtitle_by_role.get(role, "Vue adaptee a votre role."),
        "finance_visible": role in ["admin", "manager"],
    }


def build_sections(role):
    if role == "tailor":
        return {
            "alerts_title": "Mes echeances",
            "performance_title": "Mon activite tailleur",
            "clients_title": "Clients a suivre",
            "patterns_title": "Modeles de mes commandes",
        }
    if role == "client":
        return {
            "alerts_title": "Mes echeances",
            "performance_title": "Tailleurs sur mes commandes",
            "clients_title": "Mon profil client",
            "patterns_title": "Modeles de mes commandes",
        }
    return {
        "alerts_title": "Alertes intelligentes",
        "performance_title": "Tailleurs performants",
        "clients_title": "Clients VIP",
        "patterns_title": "Tendances modeles",
    }


def build_cards(role, stats, balance_due, due_week_count, completed_count):
    if role == "tailor":
        return [
            {
                "label": "Mes commandes",
                "value": stats["commandes_en_cours"],
                "detail": f"{stats['commandes_urgentes']} urgentes",
                "format": "number",
                "icon": "scissors",
                "accent": True,
            },
            {
                "label": "A livrer 7 jours",
                "value": due_week_count,
                "detail": f"{stats['commandes_retard']} en retard",
                "format": "number",
                "icon": "calendar",
            },
            {
                "label": "Clients suivis",
                "value": stats["clients_actifs"],
                "detail": "Sur vos commandes",
                "format": "number",
                "icon": "users",
            },
            {
                "label": "Terminees",
                "value": completed_count,
                "detail": "Commandes livrees",
                "format": "number",
                "icon": "check",
            },
        ]

    if role == "client":
        return [
            {
                "label": "Mes commandes",
                "value": stats["commandes_en_cours"],
                "detail": f"{due_week_count} livraison(s) proches",
                "format": "number",
                "icon": "scissors",
                "accent": True,
            },
            {
                "label": "Reste a payer",
                "value": balance_due,
                "detail": f"{stats['paiements_incomplets']} paiement(s) a suivre",
                "format": "money",
                "icon": "banknote",
            },
            {
                "label": "Retards",
                "value": stats["commandes_retard"],
                "detail": f"{stats['commandes_urgentes']} prioritaire(s)",
                "format": "number",
                "icon": "alert",
            },
            {
                "label": "Commandes terminees",
                "value": completed_count,
                "detail": "Historique livre",
                "format": "number",
                "icon": "check",
            },
        ]

    return [
        {
            "label": "Commandes en cours",
            "value": stats["commandes_en_cours"],
            "detail": f"{stats['commandes_urgentes']} urgentes",
            "format": "number",
            "icon": "scissors",
            "accent": True,
        },
        {
            "label": "Revenus du jour",
            "value": stats["revenus_jour"],
            "detail": "ce mois",
            "detail_value": stats["revenus_mois"],
            "detail_format": "money",
            "format": "money",
            "icon": "banknote",
        },
        {
            "label": "Clients actifs",
            "value": stats["clients_actifs"],
            "detail": "Clients du perimetre",
            "format": "number",
            "icon": "users",
        },
        {
            "label": "Retards",
            "value": stats["commandes_retard"],
            "detail": f"{stats['paiements_incomplets']} paiements a suivre",
            "format": "number",
            "icon": "alert",
        },
    ]


def build_timeline(role, today, orders, paid_payments):
    if role in ["admin", "manager"]:
        points = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            value = paid_payments.filter(paid_at__date=day).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            points.append({"label": DAY_LABELS[day.weekday()], "value": value})
        return {
            "title": "Revenus 7 jours",
            "subtitle": "Encaissements reels du perimetre",
            "badge": "Finance",
            "format": "money",
            "points": points,
        }

    points = []
    for offset in range(7):
        day = today + timedelta(days=offset)
        points.append({"label": DAY_LABELS[day.weekday()], "value": orders.filter(delivery_date=day).count()})
    return {
        "title": "Livraisons 7 jours",
        "subtitle": "Charge de travail selon vos commandes",
        "badge": "Planning",
        "format": "number",
        "points": points,
    }


class DashboardSummaryView(APIView):
    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        role = get_user_role(request.user)
        workshop = None if role == "admin" else get_request_workshop(request)

        orders = Order.objects.filter(is_deleted=False)
        clients = Client.objects.filter(is_deleted=False)
        paid_payments = Payment.objects.filter(is_deleted=False, status="paid")
        expenses = Expense.objects.filter(is_deleted=False)
        tailors = TailorProfile.objects.filter(is_deleted=False)
        patterns = Pattern.objects.filter(is_deleted=False)
        events = OrderEvent.objects.select_related("order")

        if workshop is not None:
            orders = orders.filter(workshop=workshop)
            clients = clients.filter(workshop=workshop)
            paid_payments = paid_payments.filter(workshop=workshop)
            expenses = expenses.filter(workshop=workshop)
            tailors = tailors.filter(workshop=workshop)
            patterns = patterns.filter(workshop=workshop)
            events = events.filter(order__workshop=workshop)

        if role == "tailor":
            tailor = getattr(request.user, "tailor_profile", None)
            if tailor is None:
                orders = empty_queryset(Order)
                clients = empty_queryset(Client)
                paid_payments = empty_queryset(Payment)
                expenses = empty_queryset(Expense)
                tailors = empty_queryset(TailorProfile)
                patterns = empty_queryset(Pattern)
                events = empty_queryset(OrderEvent)
            else:
                orders = orders.filter(assigned_tailor=tailor)
                clients = clients.filter(orders__in=orders).distinct()
                paid_payments = paid_payments.filter(order__in=orders)
                expenses = empty_queryset(Expense)
                tailors = tailors.filter(pk=tailor.pk)
                patterns = patterns.filter(orders__in=orders).distinct()
                events = events.filter(order__in=orders)

        if role == "client":
            client = get_client_for_user(request.user, clients)
            if client is None:
                orders = empty_queryset(Order)
                clients = empty_queryset(Client)
                paid_payments = empty_queryset(Payment)
                expenses = empty_queryset(Expense)
                tailors = empty_queryset(TailorProfile)
                patterns = empty_queryset(Pattern)
                events = empty_queryset(OrderEvent)
            else:
                orders = orders.filter(client=client)
                clients = clients.filter(pk=client.pk)
                paid_payments = paid_payments.filter(client=client)
                expenses = empty_queryset(Expense)
                tailors = tailors.filter(orders__in=orders).distinct()
                patterns = patterns.filter(orders__in=orders).distinct()
                events = events.filter(order__in=orders)

        urgent_orders = orders.filter(priority="urgent").exclude(status__in=["delivered", "cancelled"])
        delayed_orders = orders.filter(delivery_date__lt=today).exclude(status__in=["delivered", "cancelled"])
        active_orders = orders.exclude(status__in=ACTIVE_ORDER_EXCLUDED_STATUSES)
        completed_count = orders.filter(status="delivered").count()
        due_week_count = active_orders.filter(delivery_date__gte=today, delivery_date__lte=today + timedelta(days=7)).count()

        revenue_today = paid_payments.filter(paid_at__date=today).aggregate(total=Sum("amount"))["total"] or 0
        revenue_month = paid_payments.filter(paid_at__date__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        expenses_month = expenses.filter(spent_at__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        balance_due = get_balance_due_total(orders)
        incomplete_payment_count = get_incomplete_payment_count(orders)

        ranked_tailors = (
            tailors
            .annotate(
                active_orders=Count(
                    "orders",
                    filter=Q(orders__in=orders) & ~Q(orders__status__in=["delivered", "cancelled"]),
                    distinct=True,
                ),
                completed_orders=Count("orders", filter=Q(orders__in=orders) & Q(orders__status="delivered"), distinct=True),
            )
            .order_by("-completed_orders", "-quality_score")[:5]
        )

        recent_events = list(
            events.order_by("-created_at")[:8].values(
                "title",
                "description",
                "status",
                "created_at",
                "order__code",
            )
        )

        trending_patterns = list(
            patterns.order_by("-trend_score", "name")[:6].values(
                "id",
                "name",
                "category",
                "trend_score",
                "is_favorite",
            )
        )

        vip_clients = clients.order_by("-vip_level", "full_name")
        if role in ["admin", "manager"]:
            vip_clients = vip_clients.filter(vip_level__gte=3)

        stats = {
            "commandes_en_cours": active_orders.count(),
            "commandes_urgentes": urgent_orders.count(),
            "commandes_retard": delayed_orders.count(),
            "revenus_jour": revenue_today,
            "revenus_mois": revenue_month,
            "depenses_mois": expenses_month,
            "benefice_mois": revenue_month - expenses_month,
            "clients_actifs": clients.filter(is_active=True).count(),
            "paiements_incomplets": incomplete_payment_count,
            "reste_a_payer": balance_due,
            "livraisons_7_jours": due_week_count,
            "commandes_terminees": completed_count,
        }

        return Response(
            {
                "scope": build_scope(role, workshop),
                "sections": build_sections(role),
                "cartes": build_cards(role, stats, balance_due, due_week_count, completed_count),
                "timeline": build_timeline(role, today, orders, paid_payments),
                "stats": stats,
                "alertes": {
                    "urgentes": list(
                        urgent_orders.select_related("client", "assigned_tailor")[:5].values(
                            "id",
                            "code",
                            "client__full_name",
                            "delivery_date",
                            "status",
                        )
                    ),
                    "retards": list(
                        delayed_orders.select_related("client")[:5].values(
                            "id",
                            "code",
                            "client__full_name",
                            "delivery_date",
                            "status",
                        )
                    ),
                    "vip": list(
                        vip_clients[:5].values("id", "full_name", "phone", "vip_level")
                    ),
                },
                "tailleurs": [
                    {
                        "id": tailor.id,
                        "full_name": tailor.full_name,
                        "specialty": tailor.specialty,
                        "quality_score": tailor.quality_score,
                        "active_orders": tailor.active_orders,
                        "completed_orders": tailor.completed_orders,
                    }
                    for tailor in ranked_tailors
                ],
                "tendances_modeles": trending_patterns,
                "activite_recente": recent_events,
            }
        )
