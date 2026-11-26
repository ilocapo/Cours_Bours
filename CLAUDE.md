# ZST Beauty Center — site vitrine

Tu construis le site vitrine de **ZST Beauty Center**, un salon de beauté afro avec trois univers : coiffure (femme & homme), spa et ongles. Instagram : @zst_beauty_center.
Le porteur du projet s'appelle Baruch. Il parle français et il a horreur de tout ce qui « fait IA » ou « template ». Le site doit être élégant, sobre et immersif.

## Stack (pensée pour évoluer)
Le site doit grandir en trois étapes. On choisit dès la v1 une base qui les porte toutes, pour ne jamais devoir tout refaire :
- **v1 — vitrine immersive** : c'est ce qu'on construit maintenant.
- **v2 — réservation en ligne sur le site.** Le client choisit un rituel, une durée, une date, un créneau et, en option, une personne du salon. Il reçoit une confirmation par e-mail (et plus tard par SMS). Un acompte via Stripe est possible en option.
- **v3 — CRM et gestion des réservations** (espace admin) : agenda, fiches clientes (historique, notes, préférences), gestion des prestations, des tarifs, du personnel et des horaires, statistiques.

Choix techniques :
- **Next.js (App Router, TypeScript)** : une seule base de code pour la vitrine, l'API de réservation et l'espace admin.
- **GSAP** (ScrollTrigger) et **Lenis** pour les animations de la vitrine.
- **Supabase**, à partir de la v2 : base Postgres, authentification pour l'admin, sécurité au niveau des lignes (RLS) et stockage des photos.
- **Resend** pour les e-mails de confirmation (v2). SMS plus tard, via Brevo ou Twilio.
- **Vercel** pour l'hébergement, depuis un dépôt GitHub. Nom de domaine chez OVH ou Gandi, branché dans Vercel. L'admin pourra vivre sur `admin.<domaine>`.
- CSS à la main avec des variables (CSS Modules ou fichiers globaux). Pas de framework UI lourd sur la vitrine.

Règles dès la v1, pour préparer la suite :
- Toutes les données (rituels, durées, prix, catégories, horaires) vivent dans `src/data/*.ts`. Elles ont la même forme que les futures tables : `services`, `categories`, `opening_hours`, `staff`. En v2, on remplacera la lecture du fichier par une requête Supabase, sans toucher aux pages.
- Le bouton « Réserver » est un seul composant, `<BookingButton/>`. En v1, il ouvre `NEXT_PUBLIC_BOOKING_URL` (Planity ou Fresha). En v2, il ouvrira le parcours de réservation interne.
- Prévoir dès maintenant les routes `/reserver` (placeholder) et `/admin` (non publiée).
- RGPD : mentions légales, politique de confidentialité, pas de cookies non essentiels sans consentement. En v2 et v3, les données clientes restent dans Supabase, en région UE.

Notifications et rappels (v2, enrichis en v3) :
- **Côté cliente** :
  - à la réservation : e-mail de confirmation, avec un fichier .ics « ajouter à mon agenda » et un lien pour annuler ou déplacer le rendez-vous ;
  - rappels automatiques, par e-mail et par SMS : la veille (J-1) et 2 h avant (H-2) ;
  - après le rendez-vous, en v3 : un message de remerciement et une demande d'avis.
- **Côté salon** : notification à chaque nouvelle réservation, annulation ou modification, par e-mail ou par notification sur l'admin.
- **Technique** :
  - une table `notifications` (type, canal, date d'envoi prévue, statut) ;
  - une tâche planifiée toutes les 15 min (Vercel Cron, ou Supabase pg_cron avec une Edge Function) qui envoie ce qui est dû ;
  - e-mails envoyés via Resend, avec des modèles aux couleurs ZST ;
  - SMS envoyés via Brevo (expéditeur « ZST ») ;
  - WhatsApp en option plus tard (Twilio ou l'API Meta).
- **Consentement RGPD** : la cliente coche « recevoir des rappels » au moment de la réservation. Un lien de désinscription figure dans chaque message.
- **En v3** : les délais des rappels (J-1, H-2) et les textes se règlent depuis l'admin.

Exigences d'affichage :
- **Aussi soigné sur mobile que sur PC** (exigence du client). On conçoit le mobile d'abord, puis une vraie mise en page desktop, pas un mobile étiré : grilles plus larges, arches côte à côte, titres plus grands, menu en ligne en haut au lieu du « Menu ».
- Points de rupture : 390 px, 768 px, 1280 px et 1600 px et plus. Tester chaque section aux quatre tailles.
- Accessibilité : contrastes AA (ivoire sur brun prune, OK), textes alternatifs sur toutes les photos, navigation au clavier et focus visible, structure de titres h1/h2 correcte, et animations coupées si `prefers-reduced-motion`.
- Performance : images optimisées avec `next/image` (AVIF/WebP), lazy-load, LCP < 2,5 s.

## Direction artistique (ne pas improviser)
**Couleurs**
- noir profond `#070606`
- brun prune `#1C1013` (fond principal)
- ivoire `#F2EADF` (le texte sur fond sombre)
- ivoire ombré `#E3D8CA`
- gris Z `#8C8C8C` (uniquement dans le logo)
- bronze `#A07A52`, en touche rare seulement

Jamais de couleur vive.

**Typo**
- Titres : **Bodoni Moda** (Google Fonts), 400, letter-spacing légèrement négatif.
- Initiale du titre : **ZST Plume** (`public/fonts/ZSTPlume.ttf`, capitales seulement), à 1,45em, sur la première lettre d'un titre seulement.
- Texte : **Jost** 300. Petites légendes en Jost 400, capitales, letter-spacing .3em.

**Logo** (`public/logo/logo-zst.png`)
- **INTOUCHABLE** : on ne le modifie, ne le recolore et ne le déforme jamais.
- Sur fond sombre, il est posé dans une petite **arche ivoire** (rectangle au haut en demi-cercle).
- La version HD est à venir.

**L'arche** : c'est la forme signature, un demi-cercle plein en haut et une base droite (`border-radius: 999px 999px 0 0`). On l'utilise :
- pour les photos ;
- pour les boutons ;
- pour les pastilles des pictos ;
- pour les stickers.

**Plein ou fin** (règle validée) :
- En **plein** : les pictos, les boutons, les stickers et les pastilles. Arche ivoire avec le picto brun prune, ou l'inverse.
- En **fin** : les traits, les séparateurs et les cadres. Ce sont les SVG plume de `public/img/traits/` : `trait`, `souligne`, `cadre`, `arche`, `fleche` et `fleuron`, chacun en ivoire et en `-prune`.
- Une seule boucle par élément.

**Pictos** : `public/img/pictos/*.svg`, dessinés à la plume. Ils sont neuf : tresse, peigne, goutte, galets, vernis, ongle, miroir, sablier, zeste. Chacun existe en ivoire et en `-prune`.

**Textures** : `public/img/textures/`.
- `ruban-noir` : la couverture, le hero.
- `ruban-marbre` : version brun prune.
- `ruban-stuc` : version ivoire.
- `semis-*` : motif secondaire, discret.

**Photos** : `public/img/photos/`. Ce sont de vraies photos du salon et des prestations. On les garde fidèles : pas de filtre fort, pas de recadrage qui coupe la prestation.
- Salon : `salon-vue` (vue d'ensemble), `salon-logo-hd`, `salon-mur-hd` (le mur « ZST — Là où commence la beauté »), `salon-cabine` (cabine spa) et `salon-postes-filtre`.
- Prestations : `presta-*`.

**Ton**
- On vouvoie sur le site.
- Le slogan est **« Là où commence la beauté. »** : c'est la phrase peinte sur le mur du salon.
- Phrases courtes. Pas de superlatifs.

## Structure de la page d'accueil
Voir `reference/maquette-accueil.html` et `reference/ecran-1..6.png`.
1. **Ouverture.**
   - Plein écran sur `ruban-noir`.
   - En haut : le logo dans son arche, et « Menu ».
   - Le titre « Là où commence la beauté. » (initiale L en Plume), avec le `souligne` plume dessous.
   - Le bouton « Réserver », avec un indicateur « Défiler ».
2. **Le salon.**
   - Le titre « Un lieu où l'on prend le temps. », puis la photo `salon-vue` dans une arche.
3. **Trois rituels.**
   - Sur fond ivoire.
   - Trois arches photo : Coiffure, Spa, Ongles.
   - Le fleuron, puis le bouton « Voir la carte ».
4. **La carte des rituels.**
   - Une liste des soins avec leur durée, séparés par des filets fins.
   - Une photo en arche à côté.
   - La vraie carte est à venir : en attendant, mettre des données d'exemple dans `src/data/services.ts`.
5. **Le travail.**
   - Une galerie de prestations en arches, sur fond ivoire.
   - Un lien vers Instagram.
6. **Nous trouver.**
   - La photo `salon-logo-hd` en arche.
   - L'adresse et les horaires (à venir, mettre en placeholder).
   - Le bouton Réserver.
   - « ZST » en Bodoni géant en pied de page.

**Partout sur mobile** : une barre fixe en bas, « Réserver un rituel → ». Elle pointe vers le lien de réservation (Planity ou Fresha, à confirmer). Variable d'environnement : `NEXT_PUBLIC_BOOKING_URL`.

Prévoir ensuite les pages **Coiffure**, **Spa**, **Ongles** et **La carte**, avec le même gabarit.

## Animations (inspiration : `reference/inspiration-wrenlow-frames.png`, site Wrenlow de danielius.studio)
- **Défilement fluide** avec Lenis, sans effet élastique exagéré.
- **L'arche qui s'ouvre** : la photo du salon commence dans une petite arche, puis s'élargit au scroll jusqu'au plein écran (GSAP ScrollTrigger avec scrub, en animant `clip-path` ou `width` et le `border-radius`). Le slogan se pose dessus à la fin.
- **Titres** : ils apparaissent ligne par ligne, avec un léger glissement vers le haut et un fondu (0,9 s, ease `power3.out`).
- **Photos** : léger parallaxe interne (`scale` de 1,1 à 1).
- **Traits plume** : ils se « dessinent » à l'entrée, avec un masque de gauche à droite.
- **Pied de page** : « ZST » géant qui remonte doucement.
- Tout doit rester lent et calme : on prend le temps. Pas de rebond, pas de rotation, pas de curseur custom gadget.

## À faire en premier
1. Lancer un projet Next.js (TypeScript, App Router) dans ce dossier, en gardant `public/` tel quel.
2. Construire la page d'accueil fidèle à la maquette, mobile d'abord, puis l'adapter au desktop (grille plus large, arches plus grandes).
3. Ajouter les animations.
4. Créer le dépôt GitHub et déployer sur Vercel.

## En attente côté client
- Logo en HD.
- Vraie carte des soins avec les prix et les durées.
- Adresse, horaires et téléphone.
- Lien de réservation.
- 3 ou 4 vidéos courtes à l'horizontale, pour remplacer certaines photos plus tard : mains qui tressent, eau du bac, lumière sur le marbre, vernis.
