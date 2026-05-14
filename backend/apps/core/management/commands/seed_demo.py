from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.analytics.models import StatisticItem
from apps.appointments.models import Appointment
from apps.clients.models import Client
from apps.core.models import Workshop, WorkshopMembership
from apps.measurements.models import MeasurementProfile
from apps.notifications.models import Notification
from apps.orders.models import Order, OrderEvent, Pattern
from apps.payments.models import Expense, Payment
from apps.tailors.models import TailorProfile


class Command(BaseCommand):
    help = "Cree des donnees de demonstration pour l'atelier."

    def handle(self, *args, **options):
        workshop, _ = Workshop.objects.get_or_create(
            slug="atelier-principal",
            defaults={
                "name": "Atelier Principal",
                "currency": "XOF",
                "is_active": True,
            },
        )

        admin_user, admin_created = User.objects.get_or_create(
            username="admin",
            defaults={
                "first_name": "Admin",
                "last_name": "Atelier",
                "email": "admin@atelier.local",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.is_staff = True
        admin_user.is_superuser = True
        if admin_created or not admin_user.check_password("admin123"):
            admin_user.set_password("admin123")
        admin_user.save()
        UserProfile.objects.update_or_create(
            user=admin_user,
            defaults={"role": UserProfile.ROLE_ADMIN, "phone": "+227 90 00 00 01"},
        )

        manager, created = User.objects.get_or_create(
            username="gerant",
            defaults={
                "first_name": "Amina",
                "last_name": "Diallo",
                "email": "gerant@atelier.local",
                "is_staff": False,
                "is_superuser": False,
            },
        )
        manager.is_staff = False
        manager.is_superuser = False
        if created:
            manager.set_password("atelier12345")
        manager.save()
        UserProfile.objects.update_or_create(
            user=manager,
            defaults={"role": UserProfile.ROLE_MANAGER, "phone": "+227 90 00 00 00"},
        )
        WorkshopMembership.objects.update_or_create(
            user=manager,
            workshop=workshop,
            defaults={"role": WorkshopMembership.ROLE_MANAGER, "is_active": True},
        )

        tailors = [
            ("Moussa Garba", "Bazin et boubou luxe", ["bazin", "boubou", "finition main"], "available", "4.80"),
            ("Fatou Ibrahim", "Robes et mariage", ["robe", "kaftan", "broderie"], "busy", "4.90"),
            ("Issoufou Sani", "Costumes et uniformes", ["costume", "uniforme", "retouches"], "available", "4.60"),
        ]
        tailor_objects = []
        for full_name, specialty, skills, status, score in tailors:
            tailor, _ = TailorProfile.objects.update_or_create(
                full_name=full_name,
                defaults={
                    "workshop": workshop,
                    "specialty": specialty,
                    "skills": skills,
                    "status": status,
                    "quality_score": Decimal(score),
                    "average_delay_days": Decimal("0.50" if status == "busy" else "0.10"),
                },
            )
            tailor_objects.append(tailor)

        clients = [
            ("Mariam Abdou", "+227 91 11 22 33", "female", 4, "Aime les finitions discretes et les tons ivoire."),
            ("Oumarou Ali", "+227 96 44 55 66", "male", 3, "Prefere les coupes droites et cols propres."),
            ("Zeinabou Salif", "+227 98 77 88 99", "female", 5, "Cliente VIP mariage, delais tres sensibles."),
            ("Hamidou Maiga", "+227 90 12 34 56", "male", 1, "Commandes regulieres pour bureau."),
        ]
        client_objects = []
        for full_name, phone, gender, vip, note in clients:
            client, _ = Client.objects.update_or_create(
                phone=phone,
                defaults={
                    "workshop": workshop,
                    "full_name": full_name,
                    "whatsapp": phone,
                    "gender": gender,
                    "vip_level": vip,
                    "private_notes": note,
                    "preferences": {"style": "premium", "contact": "whatsapp"},
                },
            )
            client_objects.append(client)

        measure_sets = [
            {"poitrine": 92, "taille": 74, "hanche": 101, "longueur_robe": 148, "bras": 58},
            {"poitrine": 102, "epaule": 46, "manche": 62, "longueur": 112, "col": 41},
            {"poitrine": 88, "taille": 68, "hanche": 96, "longueur_robe": 155, "bras": 57},
            {"poitrine": 106, "epaule": 48, "manche": 63, "pantalon": 104, "col": 42},
        ]
        profiles = []
        for client, measures in zip(client_objects, measure_sets):
            category = "woman" if client.gender == "female" else "man"
            profile, _ = MeasurementProfile.objects.update_or_create(
                client=client,
                label="Profil principal",
                defaults={
                    "workshop": workshop,
                    "category": category,
                    "measurements": measures,
                    "notes": "Mesures de reference validees.",
                    "is_default": True,
                },
            )
            profiles.append(profile)

        patterns = [
            ("Boubou royal brode", "boubou", ["bazin", "luxe", "broderie"], 96),
            ("Kaftan ivoire reception", "kaftan", ["mariage", "ivoire"], 88),
            ("Costume bleu nuit", "costume", ["business", "premium"], 82),
            ("Robe sirene doree", "robe", ["mariage", "soiree"], 91),
            ("Uniforme direction", "uniforme", ["corporate"], 70),
        ]
        pattern_objects = []
        for name, category, tags, trend_score in patterns:
            pattern, _ = Pattern.objects.update_or_create(
                name=name,
                defaults={
                    "workshop": workshop,
                    "category": category,
                    "tags": tags,
                    "trend_score": trend_score,
                    "is_favorite": trend_score > 90,
                    "description": "Modele premium catalogue atelier.",
                },
            )
            pattern_objects.append(pattern)

        today = timezone.localdate()
        order_specs = [
            (client_objects[0], profiles[0], pattern_objects[0], tailor_objects[0], "Bazin riche", "Noir", "185000", "50000", today + timedelta(days=2), "urgent", "sewing", 58),
            (client_objects[1], profiles[1], pattern_objects[2], tailor_objects[2], "Laine fine", "Bleu nuit", "220000", "100000", today + timedelta(days=7), "high", "cutting", 25),
            (client_objects[2], profiles[2], pattern_objects[3], tailor_objects[1], "Dentelle luxe", "Dore", "350000", "200000", today - timedelta(days=1), "urgent", "late", 72),
            (client_objects[3], profiles[3], pattern_objects[4], tailor_objects[2], "Coton premium", "Blanc casse", "90000", "30000", today + timedelta(days=12), "normal", "pending", 10),
        ]
        for client, profile, pattern, tailor, fabric, color, price, advance, delivery, priority, status, progress in order_specs:
            order, _ = Order.objects.update_or_create(
                client=client,
                pattern=pattern,
                delivery_date=delivery,
                defaults={
                    "workshop": workshop,
                    "measurement_profile": profile,
                    "assigned_tailor": tailor,
                    "fabric": fabric,
                    "color": color,
                    "total_price": Decimal(price),
                    "advance_paid": Decimal(advance),
                    "deposit_date": today - timedelta(days=3),
                    "priority": priority,
                    "status": status,
                    "progress": progress,
                    "notes": "Commande creee depuis les donnees de demonstration.",
                },
            )
            OrderEvent.objects.get_or_create(
                order=order,
                title="Commande preparee",
                defaults={"status": status, "actor": manager.username},
            )
            Payment.objects.get_or_create(
                client=client,
                order=order,
                reference=f"REC-{order.code}",
                defaults={
                    "workshop": workshop,
                    "amount": Decimal(advance),
                    "method": "cash",
                    "status": "paid",
                    "notes": "Avance initiale.",
                },
            )

        Expense.objects.get_or_create(
            label="Achat accessoires luxe",
            spent_at=today,
            defaults={
                "workshop": workshop,
                "category": "equipment",
                "amount": Decimal("45000"),
                "notes": "Boutons, doublures et fils.",
            },
        )

        for model in [
            Appointment,
            Client,
            Expense,
            MeasurementProfile,
            Notification,
            Order,
            Pattern,
            Payment,
            StatisticItem,
            TailorProfile,
        ]:
            model.objects.filter(workshop__isnull=True).update(workshop=workshop)

        self.stdout.write(
            self.style.SUCCESS("Donnees demo pretes. Admin: admin / admin123. Gerant: gerant / atelier12345")
        )
