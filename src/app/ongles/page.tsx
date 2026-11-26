import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";

export const metadata: Metadata = { title: "Ongles", description: "Ongles chez ZST Beauty Center : les rituels et leurs durées." };

export default function Page() {
  return <CategoryPage slug="ongles" />;
}
