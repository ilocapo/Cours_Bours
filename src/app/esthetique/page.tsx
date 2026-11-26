import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";

export const metadata: Metadata = { title: "Esthétique", description: "Esthétique et maquillage chez ZST Beauty Center : soins du visage, épilation, regard, mise en beauté." };

export default function Page() {
  return <CategoryPage slug="esthetique" />;
}
