import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { FeaturesSection } from '@/sections/features/FeaturesSection';
import { Hero } from '@/sections/hero/Hero';
import { MetricsSection } from '@/sections/metrics/MetricsSection';
import { PlansSection } from '@/sections/plans/PlansSection';
import { TechnologySection } from '@/sections/technology/TechnologySection';

/* =============================================================================
   PÁGINA
   ========================================================================== */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-carbon-900 font-sans text-gray-200">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:text-carbon-900"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Hero />
        <MetricsSection />
        <FeaturesSection />
        <TechnologySection />
        <PlansSection />
      </main>
      <Footer />
    </div>
  );
}
