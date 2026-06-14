"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type FooterScatterTextProps = {
  text: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  charClassName?: string;
  spread?: number;
  rotate?: number;
  start?: string;
  end?: string;
  scrub?: number;
};

export function FooterScatterText({
  text,
  triggerRef,
  className,
  charClassName,
  spread = 50,
  rotate = 50,
  start = "top 95%",
  end = "center 55%",
  scrub = 0.85,
}: FooterScatterTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const characters = text.split("");
  const centerIndex = Math.floor(characters.length / 2);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!triggerRef.current || !containerRef.current) return;

    const scroller = document.querySelector(".page-snap-container");
    const chars = charRefs.current.filter(Boolean) as HTMLSpanElement[];

    const ctx = gsap.context(() => {
      chars.forEach((charEl, index) => {
        const distance = index - centerIndex;

        gsap.fromTo(
          charEl,
          {
            x: distance * spread,
            rotateX: distance * rotate,
          },
          {
            x: 0,
            rotateX: 0,
            ease: "none",
            scrollTrigger: {
              trigger: triggerRef.current,
              scroller: scroller || undefined,
              start,
              end,
              scrub,
            },
          },
        );
      });
    }, containerRef);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [triggerRef, centerIndex, spread, rotate, start, end, scrub, text]);

  return (
    <span
      ref={containerRef}
      className={cn("inline-block", className)}
      style={{ perspective: "500px" }}
    >
      {characters.map((char, index) => {
        const isSpace = char === " ";

        return (
          <span
            key={`${char}-${index}`}
            ref={(node) => {
              charRefs.current[index] = node;
            }}
            className={cn("inline-block will-change-transform", isSpace && "w-[0.35em]", charClassName)}
          >
            {isSpace ? "\u00a0" : char}
          </span>
        );
      })}
    </span>
  );
}
