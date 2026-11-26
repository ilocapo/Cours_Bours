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
  bohemeProfil: p("presta-boheme-profil.jpg", "Tresses bohème, vues de profil", 1052, 1495, "50% 20%"),
  tressesIvoire: p("presta-tresses-ivoire.jpg", "Coiffure en nattes collées avec des boucles", 632, 672),
  pedicure: p("presta-pedicure.jpg", "Pose de vernis sur les ongles des pieds", 1086, 1448, "50% 45%"),
  homme: p("presta-homme.jpg", "Nattes collées pour homme, vues de face et de profil", 1312, 1199),
  perruques: p("salon-perruques.jpg", "Postes face aux grands miroirs, avec têtes à perruques", 1199, 1312, "50% 50%"),
  miroirLogo: p("salon-miroir-logo.jpg", "Le logo ZST lumineux, reflété dans les miroirs du salon", 1312, 1199),
  soinCuir: p("presta-soin-cuir.jpg", "Shampoing et massage du cuir chevelu", 1086, 1448, "50% 40%"),
  bouclesDos: p("presta-boucles-dos.jpg", "Nattes collées et boucles, vues de dos", 1086, 1448, "50% 35%"),
  cabineBlanche: p("salon-cabine-blanche.jpg", "La cabine de soin : lit blanc, vapeur et cire", 1535, 1024),
  bohemeProfilSerre: p("presta-boheme-profil-serre.jpg", "Tresses bohème, vues de profil", 615, 880),
  bohemeDos: p("presta-boheme-dos.jpg", "Tresses bohème, vues de dos", 1052, 1495, "center 15%"),
  boucles: p("presta-boucles.jpg", "Boucles définies", 1086, 1448),
  tressesSalon: p("presta-tresses-salon.jpg", "Tresses réalisées au salon", 621, 718, "center 20%"),
  tressesDetail: p("presta-tresses-detail.jpg", "Détail de tresses", 520, 520),
  tresses: p("presta-tresses.jpg", "Nattes en relief, vues de profil", 1086, 1448, "50% 30%"),
  nattes: p("presta-nattes.jpg", "Nattes collées et mèches bouclées, vues de profil", 1086, 1448, "50% 35%"),
  spa: p("presta-spa.jpg", "Soin spa", 1086, 1448),
  visage: p("presta-visage.jpg", "Soin du visage", 896, 750, "55% center"),
  ongles: p("presta-ongles.jpg", "Ongles amande, fleur de tournesol et filets dorés", 1086, 1448, "50% 30%"),
  ongles2: p("presta-ongles2.jpg", "Manucure", 1199, 1062),
};
