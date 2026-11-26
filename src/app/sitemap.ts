import type { MetadataRoute } from "next";
import { site } from "@/data/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/coiffure", "/spa", "/ongles", "/carte", "/galerie", "/a-propos", "/faq", "/reserver", "/mentions-legales", "/confidentialite"].map((p) => ({ url: `${site.url}${p}` }));
}
