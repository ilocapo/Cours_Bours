// Avis clientes. À remplir avec de vrais témoignages (avec leur accord).
export type Review = { id: string; author: string; text: string; source: "Google" | "Instagram" | "Facebook" };
export const reviews: Review[] = [];
