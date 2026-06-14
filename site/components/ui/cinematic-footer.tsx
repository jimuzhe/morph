"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  --footer-background: #050201;
  --footer-foreground: #ffffff;
  --footer-muted: rgba(255,255,255,0.52);
  --footer-border: rgba(255,255,255,0.12);
  --footer-primary: #EC4E02;
  --footer-secondary: rgba(255,255,255,0.7);
  --footer-destructive: #EC4E02;
  --pill-bg-1: rgba(255,255,255,0.08);
  --pill-bg-2: rgba(255,255,255,0.02);
  --pill-shadow: rgba(0,0,0,0.5);
  --pill-highlight: rgba(255,255,255,0.12);
  --pill-inset-shadow: rgba(0,0,0,0.8);
  --pill-border: rgba(255,255,255,0.1);
  --pill-bg-1-hover: rgba(236,78,2,0.18);
  --pill-bg-2-hover: rgba(255,255,255,0.04);
  --pill-border-hover: rgba(236,78,2,0.42);
  --pill-shadow-hover: rgba(0,0,0,0.7);
  --pill-highlight-hover: rgba(255,255,255,0.22);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(circle at 50% 50%, rgba(236,78,2,0.22) 0%, rgba(255,255,255,0.08) 40%, transparent 70%);
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
      0 10px 30px -10px var(--pill-shadow),
      inset 0 1px 1px var(--pill-highlight),
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
      0 20px 40px -10px var(--pill-shadow-hover),
      inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--footer-foreground);
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--footer-foreground) 0%, rgba(255,255,255,0.42) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px rgba(255,255,255,0.15));
}
`;

export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.4,
            y: y * 0.4,
            rotationX: -y * 0.15,
            rotationY: x * 0.15,
            scale: 1.05,
            ease: "power2.out",
            duration: 0.4,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
          });
        };

        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6">
    <span>Select &amp; Move</span> <span className="text-[#EC4E02]/70">✦</span>
    <span>Edit Text</span> <span className="text-white/55">✦</span>
    <span>Replace Images</span> <span className="text-[#EC4E02]/70">✦</span>
    <span>AI Assistant</span> <span className="text-white/55">✦</span>
    <span>Undo &amp; Redo</span> <span className="text-[#EC4E02]/70">✦</span>
    <span>Local Save</span> <span className="text-[#EC4E02]/70">✦</span>
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    const scroller = document.querySelector(".page-snap-container");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.8, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            scroller: scroller || undefined,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            scroller: scroller || undefined,
            start: "top 40%",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );
    }, wrapperRef);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    const container = document.querySelector(".page-snap-container");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const container = document.querySelector(".page-snap-container");
    const target = document.getElementById(id);
    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop,
      behavior: "smooth",
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <footer
        ref={wrapperRef}
        className="cinematic-footer-wrapper relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#050201] text-white"
      >
          <div className="footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
          <div className="footer-bg-grid pointer-events-none absolute inset-0 z-0" />

          <div
            ref={giantTextRef}
            className="footer-giant-bg-text pointer-events-none absolute -bottom-[5vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap"
          >
            MORPH
          </div>

          <div className="absolute left-0 top-12 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y border-white/10 bg-black/60 py-4 shadow-2xl backdrop-blur-md">
            <div className="flex w-max animate-footer-scroll-marquee text-xs font-bold uppercase tracking-[0.3em] text-white/50 md:text-sm">
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <h2 ref={headingRef} className="footer-text-glow mb-12 text-center text-5xl font-black tracking-tighter md:text-8xl">
              Edit HTML like slides.
            </h2>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-6">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton
                  as="button"
                  type="button"
                  onClick={() => scrollToSection("download")}
                  className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold text-white md:text-base"
                >
                  <svg className="h-6 w-6 text-white/55 transition-colors group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14.59L15.59 14 17 15.41 13.41 19 12 17.59 10.59 19 7 15.41 8.41 14 11 16.59V8h2Z" />
                  </svg>
                  Install Extension
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href="https://github.com/jimuzhe/morph"
                  className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold text-white md:text-base"
                >
                  <svg className="h-6 w-6 text-white/55 transition-colors group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A8.205 8.205 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                  </svg>
                  View Source
                </MagneticButton>
              </div>

              <p className="max-w-lg text-center text-xs leading-relaxed text-white/45 md:text-sm">
                Run <span className="text-white/70">npm run build</span>, then load the
                <span className="text-white/70"> dist/</span> folder in Chrome Extensions. For local HTML files, enable
                &quot;Allow access to file URLs.&quot;
              </p>

              <div className="mt-2 flex w-full flex-wrap justify-center gap-3 md:gap-6">
                <MagneticButton
                  as="button"
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-white/55 hover:text-white md:text-sm"
                >
                  Features
                </MagneticButton>
                <MagneticButton
                  as="button"
                  type="button"
                  onClick={() => scrollToSection("testimonials")}
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-white/55 hover:text-white md:text-sm"
                >
                  Reviews
                </MagneticButton>
                <MagneticButton
                  as="button"
                  type="button"
                  onClick={scrollToTop}
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-white/55 hover:text-white md:text-sm"
                >
                  Back to Top
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full items-center justify-between px-6 pb-8 md:px-12">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45 md:text-xs">
              © 2026 Morph v1.1.1
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              className="footer-glass-pill flex h-12 w-12 items-center justify-center rounded-full text-white/55 hover:text-white"
            >
              <svg className="h-5 w-5 transition-transform duration-300 hover:-translate-y-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
      </footer>
    </>
  );
}
