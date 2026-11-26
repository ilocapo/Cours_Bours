import Chrome from "./Chrome";
import MonoArch from "./MonoArch";
import Pastille from "./Pastille";
import Title from "./Title";

// Planche 01 du brand book : grand titre (une ligne en bronze italique), texte, trois pictos pleins, trois libellés.
export default function Concept() {
  return (
    <section className="sec sec--iv panel" id="concept">
      <div className="wrap wrap--narrow">
        <Chrome left="01 · Concept" right="ZST" />
        <Title initial accent={1} className="concept__title" lines={["La maison qui", "prend le temps."]} />
        <p className="concept__p" data-fade>
          ZST, c’est trois rituels : la coiffure (tresses, soins des cheveux crépus), le spa (visage, massage) et les ongles
          (manucure, pédicure). Pour elle, pour lui, pour les enfants.
        </p>
        <div className="concept__row">
          <div className="concept__pictos" data-fade>
            <Pastille name="tresse" tone="prune" />
            <Pastille name="goutte" tone="prune" />
            <Pastille name="vernis" tone="prune" />
          </div>
          <MonoArch variant="filet" tone="prune" size={84} />
        </div>
        <div className="chrome lb concept__foot" data-fade>
          <span>Coiffure</span><span>Spa</span><span>Ongles</span>
        </div>
      </div>
    </section>
  );
}
