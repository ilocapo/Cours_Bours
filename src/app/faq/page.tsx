import type { Metadata } from "next";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import Title from "@/components/Title";

export const metadata: Metadata = { title: "Questions fréquentes" };

export default function Page() {
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <div className="lb dim">Questions</div>
          <Title as="h1" initial lines={["Bon à savoir"]} />
          <Faq />
        </div>
      </section>
      <Footer />
    </>
  );
}
