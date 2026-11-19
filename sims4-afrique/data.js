// ============================================================
//  CATALOGUE — c'est le seul fichier à modifier pour ajouter
//  du contenu ou publier une mise à jour.
//  - `download` : mets ici le lien officiel du/de la créateur·rice
//    (Patreon, CurseForge, TSR, Drive...). Remplace les liens
//    d'exemple ci-dessous par les vrais avant de publier.
//  - `previews` : 3 aperçus générés (motif + palette). Pour de
//    vraies captures, mets `img: "images/xxx.jpg"` dans un aperçu.
//  - `updates`  : le plus récent en premier.
// ============================================================
window.CATALOGUE = [
  {
    id: "boubou-wax", type: "cc", category: "Vêtements",
    name: "Boubou Wax Brodé",
    creator: "Créateur·rice à créditer",
    blurb: "Boubou long et ample en wax, 12 imprimés, pour adultes, femmes et hommes. Broderies au col et aux manches.",
    region: "Afrique de l'Ouest", version: "1.2", size: "38 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["wax", "tenue de fête", "unisexe"],
    previews: [
      { pattern: "wax", pal: ["#f2b705", "#0b5d3b", "#d1380f", "#fff4d6"], caption: "Imprimé soleil — jaune & vert" },
      { pattern: "wax", pal: ["#1f4fbf", "#f4a300", "#fff4d6", "#0a1f5c"], caption: "Imprimé cobalt & or", v: 1 },
      { pattern: "wax", pal: ["#c2185b", "#fff4d6", "#4a0d2e", "#ff8fb3"], caption: "Imprimé fuchsia", v: 2 }
    ],
    updates: [
      { v: "1.2", date: "2026-11-12", note: "4 nouveaux imprimés et correction du col sur les tenues enfant." },
      { v: "1.0", date: "2026-10-20", note: "Sortie initiale : 8 imprimés, 3 coupes." }
    ]
  },
  {
    id: "tresses-fulani", type: "cc", category: "Cheveux",
    name: "Tresses Fulani & Perles",
    creator: "Créateur·rice à créditer",
    blurb: "Tresses Fulani avec cauris et perles dorées, 18 couleurs, compatible casque et couvre-chefs.",
    region: "Sahel", version: "2.0", size: "54 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["cheveux", "perles", "tresses"],
    previews: [
      { pattern: "fulani", pal: ["#1b1208", "#d9a441", "#f4e3c1", "#7a4a1d"], caption: "Noir de jais, perles dorées" },
      { pattern: "fulani", pal: ["#4a2511", "#f4e3c1", "#d9a441", "#1b1208"], caption: "Brun chaud, cauris", v: 1 },
      { pattern: "fulani", pal: ["#6b1f2a", "#d9a441", "#f4e3c1", "#1b1208"], caption: "Bordeaux, perles rouges", v: 2 }
    ],
    updates: [
      { v: "2.0", date: "2026-11-17", note: "Ajout de 6 couleurs et d'une version courte. Fichier allégé de 20 %." },
      { v: "1.1", date: "2026-10-30", note: "Correction du clipping avec les lunettes." }
    ]
  },
  {
    id: "gele-ankara", type: "cc", category: "Accessoires",
    name: "Gèlè en Ankara",
    creator: "Créateur·rice à créditer",
    blurb: "Foulard de tête noué façon gèlè, 3 hauteurs de nœud et 15 tissus, pour jeunes adultes et adultes.",
    region: "Afrique de l'Ouest", version: "1.0", size: "21 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["foulard", "mariage", "accessoire"],
    previews: [
      { pattern: "kente", pal: ["#e8a317", "#1a7f4b", "#c0272d", "#111111"], caption: "Tissu kente vert & or" },
      { pattern: "kente", pal: ["#7b2cbf", "#f9c74f", "#fff1d6", "#240046"], caption: "Violet & jaune", v: 1 },
      { pattern: "kente", pal: ["#0f766e", "#fde68a", "#f97316", "#052e2b"], caption: "Turquoise & orange", v: 2 }
    ],
    updates: [
      { v: "1.0", date: "2026-11-08", note: "Sortie initiale." }
    ]
  },
  {
    id: "bogolan-deco", type: "cc", category: "Maison",
    name: "Bogolan — Déco murale & coussins",
    creator: "Créateur·rice à créditer",
    blurb: "Tapisseries, coussins et tapis inspirés du bogolan malien. Se trouve en mode Construction.",
    region: "Mali", version: "1.1", size: "16 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["déco", "bogolan", "mode construction"],
    previews: [
      { pattern: "bogolan", pal: ["#f1e4c8", "#3b2a1a", "#a4552b", "#6b3e1f"], caption: "Tapisserie crème & terre" },
      { pattern: "bogolan", pal: ["#2b1d12", "#f1e4c8", "#c9873c", "#8a5a2b"], caption: "Coussin sombre", v: 1 },
      { pattern: "bogolan", pal: ["#e7d3a8", "#1d1a16", "#8f3b1f", "#4f6b3a"], caption: "Tapis ocre", v: 2 }
    ],
    updates: [
      { v: "1.1", date: "2026-11-14", note: "Ajout de 4 coussins et d'un tapis rond." },
      { v: "1.0", date: "2026-11-01", note: "Sortie initiale." }
    ]
  },
  {
    id: "fetes-traditions", type: "mod", category: "Gameplay",
    name: "Fêtes & Traditions d'Afrique",
    creator: "Créateur·rice à créditer",
    blurb: "Nouveaux événements : mariage coutumier, baptême, fête des récoltes. Interactions de salutation et de danse.",
    region: "Pan-africain", version: "0.9", size: "2,4 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["événements", "danse", "script"],
    requires: "Pack de jeu de base à jour. Mod à scripts : activer « Mods de script » dans les options.",
    previews: [
      { pattern: "ndebele", pal: ["#d62828", "#1d3557", "#f4d35e", "#f7f0e0"], caption: "Menu des fêtes" },
      { pattern: "ndebele", pal: ["#2a9d8f", "#e76f51", "#f4d35e", "#264653"], caption: "Mariage coutumier", v: 1 },
      { pattern: "ndebele", pal: ["#6a4c93", "#ffca3a", "#ff595e", "#f7f0e0"], caption: "Danse de groupe", v: 2 }
    ],
    updates: [
      { v: "0.9", date: "2026-11-18", note: "Compatible avec la dernière mise à jour du jeu. Ajout de la fête des récoltes." },
      { v: "0.8", date: "2026-11-05", note: "Événement « Baptême » et 6 nouvelles interactions." }
    ]
  },
  {
    id: "cuisine-afrique", type: "mod", category: "Cuisine",
    name: "Cuisine d'Afrique de l'Ouest",
    creator: "Créateur·rice à créditer",
    blurb: "14 recettes : riz jollof, mafé, attiéké-poisson, thieboudienne… avec niveaux de compétence cuisine.",
    region: "Afrique de l'Ouest", version: "1.3", size: "9 Mo",
    download: "https://www.curseforge.com/sims4",
    tags: ["recettes", "cuisine", "repas"],
    requires: "Aucun pack requis. Fichier .package à placer dans le dossier Mods.",
    previews: [
      { pattern: "wax", pal: ["#e4572e", "#f3a712", "#29335c", "#fdf0d5"], caption: "Riz jollof" },
      { pattern: "wax", pal: ["#6b4226", "#f3a712", "#fdf0d5", "#2d6a4f"], caption: "Mafé", v: 1 },
      { pattern: "wax", pal: ["#1d4e89", "#fdf0d5", "#e4572e", "#f3a712"], caption: "Thieboudienne", v: 2 }
    ],
    updates: [
      { v: "1.3", date: "2026-11-16", note: "Ajout de 3 recettes (attiéké-poisson, alloco, bissap). Meilleurs temps de cuisson." },
      { v: "1.2", date: "2026-11-02", note: "Correction des ingrédients manquants au marché." }
    ]
  }
];
