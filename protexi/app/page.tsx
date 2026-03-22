import Nav from '../components/Nav'
import Hero from '../components/Hero'
import { TrustStrip, ProblemSolution, Features, UseCases } from '../components/Sections'
import Pricing from '../components/Pricing'
import { Testimonials, FAQ, MidCTA, FinalCTA, Footer } from '../components/Bottom'

export default function Home() {
  return (
    <>
      <Nav />

      <main>
        {/* 1. Hero */}
        <Hero />

        {/* 2. Trust strip */}
        <TrustStrip />

        {/* 3. Problem → Solution */}
        <ProblemSolution />

        {/* 4. Features */}
        <Features />

        {/* 5. Mid-page CTA */}
        <MidCTA />

        {/* 6. Pricing estimator + cards + matrix */}
        <Pricing />

        {/* 7. Use cases */}
        <UseCases />

        {/* 8. Testimonials */}
        <Testimonials />

        {/* 9. FAQ */}
        <FAQ />

        {/* 10. Final CTA */}
        <FinalCTA />
      </main>

      <Footer />
    </>
  )
}
