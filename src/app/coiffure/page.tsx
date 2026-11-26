import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";

export const metadata: Metadata = { title: "Coiffure", description: "Coiffure chez ZST Beauty Center : les rituels et leurs durées." };

export default function Page() {
  return <CategoryPage slug="coiffure" />;
}
