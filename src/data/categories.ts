// Même forme que la future table `categories`.
export type Category = {
  id: string;
  slug: "coiffure" | "spa" | "ongles";
  name: string;
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
    intro:
      "Tresses, nattes, boucles et soins. Chaque coiffure se prépare avec vous, sans précipitation.",
    image: "/img/photos/presta-nattes.jpg",
    imagePosition: "70% 20%",
    picto: "tresse",
  },
  {
    id: "cat-spa",
    slug: "spa",
    name: "Spa",
    tagline: "Visage · corps · massage",
    intro:
      "Une cabine au calme, des gestes lents. Le temps de souffler avant le reste de la journée.",
    image: "/img/photos/presta-visage.jpg",
    imagePosition: "55% center",
    picto: "galets",
  },
  {
    id: "cat-ongles",
    slug: "ongles",
    name: "Ongles",
    tagline: "Manucure · pédicure",
    intro:
      "Des mains soignées, un geste précis. Manucure, gel et vernis, dans un décor de marbre.",
    image: "/img/photos/presta-ongles2m.jpg",
    imagePosition: "70% center",
    picto: "vernis",
  },
];
