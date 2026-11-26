/** Montants en francs CFA (XOF), sans décimale. */
export const formatXof = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ")} F CFA`;
export const toXof = (raw: string): number | null => {
  const n = Number(String(raw).replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
