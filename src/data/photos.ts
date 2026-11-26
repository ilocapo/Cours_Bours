export type Photo = { src: string; alt: string; position?: string; w: number; h: number };

const p = (file: string, alt: string, w: number, h: number, position?: string): Photo => ({
  src: `/img/photos/${file}`, alt, w, h, position,
});

export const photos = {
  salonVue: p("salon-vue.jpg", "Vue d'ensemble du salon ZST : marbre, lumière douce et postes de coiffure", 1534, 1025),
  salonLogo: p("salon-logo-hd.jpg", "Le logo ZST sur un mur du salon", 770, 779, "center 45%"),
  salonMur: p("salon-mur-hd.jpg", "Le mur du salon : ZST, là où commence la beauté", 1774, 887),
  salonCabine: p("salon-cabine.jpg", "La cabine spa du salon ZST", 1155, 744),
  salonPostes: p("salon-postes-filtre.jpg", "Les postes de coiffure du salon ZST", 1199, 1312),
  salonMiroirs: p("salon-miroirs.jpg", "Les postes de coiffure face aux grands miroirs, sol en marbre brun", 918, 610),
  salonLavage: p("salon-lavage.jpg", "L'espace lavage et les fauteuils du salon", 918, 610),
  salonPosteBleu: p("salon-poste-bleu.jpg", "Un poste de soin avec fauteuil bleu et miroir", 918, 610),
  bohemeProfilSerre: p("presta-boheme-profil-serre.jpg", "Tresses bohème, vues de profil", 615, 880),
  bohemeDos: p("presta-boheme-dos.jpg", "Tresses bohème, vues de dos", 737, 1495, "center 15%"),
  boucles: p("presta-boucles.jpg", "Boucles définies", 1086, 1448),
  tressesSalon: p("presta-tresses-salon.jpg", "Tresses réalisées au salon", 621, 718, "center 20%"),
  tressesDetail: p("presta-tresses-detail.jpg", "Détail de tresses", 520, 520),
  tresses: p("presta-tresses.jpg", "Tresses", 840, 1050),
  nattes: p("presta-nattes.jpg", "Nattes", 1026, 1030, "70% 20%"),
  spa: p("presta-spa.jpg", "Soin spa", 1086, 1448),
  visage: p("presta-visage.jpg", "Soin du visage", 896, 750, "55% center"),
  ongles: p("presta-ongles.jpg", "Pose d'ongles", 1086, 1448),
  ongles2: p("presta-ongles2.jpg", "Manucure", 1199, 1062),
};
