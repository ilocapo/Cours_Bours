// Même forme que la future table `categories`. Quatre catégories pour tout le site.
export type Category = {
  id: string;
  slug: "coiffure" | "spa" | "ongles" | "esthetique";
  name: string;
  /** Légende courte (cartes, pages). */
  tagline: string;
  intro: string;
  image: string;
  imagePosition: string;
  picto: string;
};

export const categories: Category[] = [
  {
    id: "cat-coiffure",
    slug: "coiffure",
    name: "Coiffure",
    tagline: "Femme, homme, enfant",
    intro: "Tresses, nattes, boucles, tissages et soins. Chaque coiffure se prépare avec vous, sans précipitation.",
    image: "/img/photos/presta-nattes.jpg",
    imagePosition: "50% 30%",
    picto: "tresse",
  },
  {
    id: "cat-spa",
    slug: "spa",
    name: "Spa",
    tagline: "Massage · soins du corps",
    intro: "Une cabine au calme, des gestes lents. Massages, gommages et soins du corps, le temps de souffler.",
    image: "/img/photos/presta-soin-cuir.jpg",
    imagePosition: "50% 40%",
    picto: "galets",
  },
  {
    id: "cat-ongles",
    slug: "ongles",
    name: "Ongles",
    tagline: "Manucure · pédicure · gel",
    intro: "Des mains et des pieds soignés, un geste précis. Manucure, pédicure, gel, french et nail art.",
    image: "/img/photos/presta-ongles.jpg",
    imagePosition: "50% 35%",
    picto: "vernis",
  },
  {
    id: "cat-esthetique",
    slug: "esthetique",
    name: "Esthétique",
    tagline: "Visage · épilation · maquillage",
    intro: "Soins du visage, épilation, regard, maquillage et mise en beauté pour les grands jours comme pour chaque jour.",
    image: "/img/photos/salon-cabine-blanche.jpg",
    imagePosition: "30% 50%",
    picto: "miroir",
  },
];
