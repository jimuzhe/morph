"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "testimonials", label: "Reviews" },
  { id: "download", label: "Download" },
];

export function Navigation() {
  const [activeId, setActiveId] = useState("home");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const container = document.querySelector(".page-snap-container");
    if (!container) return;

    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 24);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: container,
        threshold: [0.35, 0.55, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500",
        isScrolled
          ? "border-white/10 bg-black/70 shadow-lg shadow-black/20 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <button
          type="button"
          onClick={() => scrollToSection("home")}
          className="text-sm font-black tracking-[0.28em] text-white transition-opacity hover:opacity-80 md:text-base"
        >
          MORPH
        </button>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md md:gap-2">
          {navItems.map((item) => {
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 md:px-4 md:py-2 md:text-sm",
                  isActive
                    ? "bg-white text-black shadow-md"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
