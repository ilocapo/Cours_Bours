import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";

export const metadata: Metadata = { title: "Spa", description: "Spa chez ZST Beauty Center : les rituels et leurs durées." };

export default function Page() {
  return <CategoryPage slug="spa" />;
}
