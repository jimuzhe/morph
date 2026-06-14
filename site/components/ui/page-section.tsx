"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  initialVisible?: boolean;
  delayMs?: number;
};

export function PageSection({
  children,
  className,
  contentClassName,
  id,
  initialVisible = false,
  delayMs = 0,
}: PageSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const container = section.closest(".page-snap-container");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          window.setTimeout(() => setIsVisible(true), delayMs);
        } else if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          setIsVisible(false);
        }
      },
      {
        root: container,
        threshold: [0, 0.45, 0.75],
      },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <section ref={sectionRef} id={id} className={cn("page-snap-section", className)}>
      <div
        className={cn(
          "page-section-content h-full w-full",
          isVisible ? "page-section-content--visible" : "page-section-content--hidden",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
