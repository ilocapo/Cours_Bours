import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource-variable/bodoni-moda/opsz-italic.css";
import "@fontsource/jost/latin-300.css";
import "@fontsource/jost/latin-400.css";
import Header from "@/components/Header";
import StickyBar from "@/components/StickyBar";
import Motion from "@/components/Motion";
import PageTransition from "@/components/PageTransition";
import { site } from "@/data/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.slogan}`, template: `%s — ${site.name}` },
  description: "Salon de beauté afro à Fidjrossè, Cotonou : coiffure femme, homme et enfant, spa et massages, manucure et pédicure. Là où commence la beauté.",
  alternates: { canonical: "./" },
  openGraph: {
    title: site.name, description: site.slogan, type: "website", locale: "fr_FR", url: "./", siteName: site.name,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Le salon ZST Beauty Center : marbre, miroirs et postes de coiffure" }],
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.slogan, images: ["/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#1C1013", width: "device-width", initialScale: 1 };

// Pose la classe « motion » avant le premier rendu, sauf si l'utilisatrice réduit les animations.
const boot = `(function(){var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('motion');var seen=0;try{seen=sessionStorage.getItem('zst-intro')}catch(e){}if(!seen&&location.pathname==='/'){d.classList.add('intro');setTimeout(function(){d.classList.remove('intro')},6000)}}})()`;

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
        <PageTransition />
        <Motion />
      </body>
    </html>
  );
}
