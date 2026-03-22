import Nav from "../../protexi/components/Nav";
import Hero from "../../protexi/components/Hero";
import { TrustStrip, ProblemSolution, Features, UseCases } from "../../protexi/components/Sections";
import Pricing from "../../protexi/components/Pricing";
import { Testimonials, FAQ, MidCTA, FinalCTA, Footer } from "../../protexi/components/Bottom";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemSolution />
        <Features />
        <MidCTA />
        <Pricing />
        <UseCases />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
