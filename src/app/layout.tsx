import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource/jost/latin-300.css";
import "@fontsource/jost/latin-400.css";
import Header from "@/components/Header";
import StickyBar from "@/components/StickyBar";
import Motion from "@/components/Motion";
import { site } from "@/data/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.slogan}`, template: `%s — ${site.name}` },
  description: "Salon de beauté afro : coiffure femme et homme, spa et ongles. Là où commence la beauté.",
  openGraph: { title: site.name, description: site.slogan, type: "website", locale: "fr_FR", images: ["/img/photos/salon-vue.jpg"] },
};

export const viewport: Viewport = { themeColor: "#1C1013", width: "device-width", initialScale: 1 };

// Pose la classe « motion » avant le premier rendu, sauf si l'utilisatrice réduit les animations.
const boot = `(function(){var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('motion')}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <noscript><style>{`html.motion [data-title] .line-in,html.motion [data-fade]{opacity:1!important}html.motion [data-draw]{clip-path:none!important}`}</style></noscript>
      </head>
      <body>
        <a href="#main" className="skip">Aller au contenu</a>
        <Header />
        <main id="main">{children}</main>
        <StickyBar />
        <Motion />
      </body>
    </html>
  );
}
