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
