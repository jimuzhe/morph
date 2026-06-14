import { BentoCards } from "@/components/ui/bento-cards";
import { CinematicFooter } from "@/components/ui/cinematic-footer";
import { DitheringBackground } from "@/components/ui/dithering-background";
import { MorphingText } from "@/components/ui/liquid-text";
import { Navigation } from "@/components/ui/navigation";
import { PageSection } from "@/components/ui/page-section";
import { Testimonials } from "@/components/ui/testimonials";

const words = ["MORPH", "EDIT", "DRAG", "SAVE", "HTML", "FLOW"];

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="page-snap-container bg-black text-white">
        <PageSection id="home" className="relative overflow-hidden" initialVisible>
          <DitheringBackground />
          <div className="relative z-10 flex h-full items-center justify-center px-6 pt-16">
            <h1 className="sr-only">Morph</h1>
            <MorphingText texts={words} className="text-white drop-shadow-[0_0_48px_rgba(255,255,255,0.42)]" />
          </div>
          <div className="page-hero-fade" aria-hidden />
        </PageSection>

        <div className="page-snap-gap" aria-hidden />

        <PageSection id="features" className="bg-black" delayMs={80}>
          <BentoCards />
        </PageSection>

        <div className="page-snap-gap page-snap-gap--small" aria-hidden />

        <PageSection id="testimonials" className="bg-black" delayMs={120}>
          <Testimonials />
        </PageSection>

        <div className="page-snap-gap page-snap-gap--small" aria-hidden />

        <section className="page-snap-section" id="download">
          <CinematicFooter />
        </section>
      </main>
    </>
  );
}
