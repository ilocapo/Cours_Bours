# ZST Beauty Center — état d'avancement

Dernière mise à jour : 27 novembre 2026. Légende : ✅ fait · 🟡 fait, action de Baruch requise · ⏳ à faire · ❓ à confirmer.

## 1. Site vitrine (v1)
- ✅ Accueil immersif, animations, pages Coiffure / Spa / Ongles / La carte, mentions légales, confidentialité
- ✅ Mobile d'abord, menu mobile, barre « Réserver »
- ⏳ Logo HD, vraie carte des soins (prix, durées), vidéos
- 🟡 Adresse, horaires, téléphone : Baruch les a, à m'envoyer

## 2. Réservation en ligne (v2)
- ✅ Parcours client : rituel, date, créneau, personne
- ✅ Validation nom / téléphone / e-mail
- ✅ Confirmation et rappels par e-mail (veille, 2 h avant), annulation par lien
- 🟡 Envoi réel aux clientes : domaine à vérifier chez Resend
- 🟡 Déclencheur externe toutes les 15 min (cron-job.org) vers `/api/cron/reminders`
- ⏳ Rappels SMS / WhatsApp (compte Brevo ou WhatsApp Business)
- ⏳ Acompte en ligne (MTN, Moov ou Stripe)

## 3. Espace admin (v3)
- ✅ Comptes et rôles (gérante, employée, comptable…)
- ✅ Agenda refait (jour, semaine, panneau de rendez-vous)
- ✅ Clients, factures (format temporaire), statistiques, exports
- ✅ Modèles d'e-mails modifiables, demande d'avis Google
- ✅ Pointage par code, congés, paie, Mon espace, fermetures exceptionnelles
- ✅ Migration `0003_pointage_absences.sql` lancée dans Supabase
- 🟡 Lien d'avis Google à saisir dans Réglages
- 🟡 E-mail du salon dans Réglages
- 🟡 Code de pointage de chaque employée (Équipe)
- 🟡 Compte employée lié à sa fiche (Comptes)
- ⏳ Vrai format de facture, IFU, PDF
- ⏳ Fidélité, liste d'attente, caisse du jour, français/anglais, application installable

## 4. Réservation par Instagram
- ✅ Lien message privé `ig.me/m/zst_beauty_center`, raccourcis `/instagram` et `/whatsapp`
- 🟡 Mettre le lien dans la bio Instagram

## 5. Sécurité et mise en ligne
- ✅ Code sur `main`, déploiement Vercel
- 🟡 Changer les clés exposées (Supabase, Resend, mot de passe base) et les mots de passe de test
- ⏳ Nom de domaine branché
- ⏳ Tests e2e à refaire après validation de l'aperçu

## 6. Comptes à créer (coût et priorité)
| Compte | Pour quoi | Coût | Quand |
|---|---|---|---|
| Supabase | base de données, comptes admin | gratuit (offre gratuite suffisante pour un salon) | ✅ déjà créé |
| Hébergement (Vercel aujourd'hui) | le site | gratuit, voir note ci-dessous | ✅ déjà en place |
| Resend | e-mails aux clientes | gratuit jusqu'à 3 000 e-mails/mois | ✅ créé, en mode test |
| Nom de domaine (OVH, Gandi…) | adresse du site et e-mails d'envoi | environ 10 à 15 € par an, seul coût incompressible | avant l'ouverture au public |
| cron-job.org | déclenche les rappels toutes les 15 min | gratuit | à faire, 5 minutes |
| Gmail dédié au salon | e-mail du salon en attendant | gratuit | provisoire : `emefa.capo@gmail.com`, à changer plus tard dans Réglages |
| MTN MoMo / Moov Money | acompte en ligne | à vérifier (compte marchand ou agrégateur local) | plus tard |
| Brevo ou WhatsApp Business | rappels SMS / WhatsApp | SMS payants à l'unité | plus tard |

Notes
- Paiement mobile : en attendant, le numéro MTN / Moov du salon déjà sur le site sert pour un paiement manuel. L'acompte en ligne viendra quand le compte marchand existera.
- Hébergement : Vercel Hobby est gratuit mais réservé à un usage non commercial dans ses conditions. Pour un salon, prévoir Cloudflare Pages (gratuit, usage commercial permis) ou Vercel Pro (environ 20 $ par mois).
- E-mail du salon : provisoire (`emefa.capo@gmail.com`), à remplacer plus tard dans Réglages.
