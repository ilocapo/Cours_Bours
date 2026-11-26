// Informations du salon. Les valeurs null sont « à venir » côté client.
export const site = {
  name: "ZST Beauty Center",
  slogan: "Là où commence la beauté.",
  instagram: "zst_beauty_center",
  instagramUrl: "https://www.instagram.com/zst_beauty_center/",
  facebookUrl: "https://www.facebook.com/zstbc/",
  address: "Fidjrossè, Cotonou, Bénin" as string | null,
  addressNote: "4ème rue, en face de l'église Saint François d'Assise" as string | null,
  phone: "+229 67 70 35 35" as string | null,
  whatsapp: "22967703535" as string | null,
  email: "contact@zstbeautycenter.com" as string | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
  payments: ["Espèces", "Carte bancaire", "MTN Mobile Money"],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=ZST+Beauty+Center+Fidjross%C3%A8+Cotonou",
  googleRating: { score: 4.1, count: 30 },
};
