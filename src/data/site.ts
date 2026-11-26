// Informations du salon. Les valeurs null sont « à venir » côté client.
export const site = {
  name: "ZST Beauty Center",
  slogan: "Là où commence la beauté.",
  instagram: "zst_beauty_center",
  instagramUrl: "https://www.instagram.com/zst_beauty_center/",
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
};
