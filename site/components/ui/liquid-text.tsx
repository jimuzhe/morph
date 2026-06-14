"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const morphTime = 1.5;
const cooldownTime = 0.5;

const useMorphingText = (texts: string[]) => {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2 || texts.length === 0) return;

      const safeFraction = Math.max(fraction, 0.0001);
      const invertedFraction = Math.max(1 - fraction, 0.0001);

      current2.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${Math.pow(1 - fraction, 0.4) * 100}%`;

      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    },
    [texts],
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / morphTime;

    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndexRef.current++;
    }
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, doCooldown]);

  return { text1Ref, text2Ref };
};

interface MorphingTextProps {
  className?: string;
  texts: string[];
}

const Texts = ({ texts }: Pick<MorphingTextProps, "texts">) => {
  const { text1Ref, text2Ref } = useMorphingText(texts);

  return (
    <>
      <span className="absolute left-1/2 top-1/2 inline-block w-full -translate-x-1/2 -translate-y-1/2" ref={text1Ref} />
      <span className="absolute left-1/2 top-1/2 inline-block w-full -translate-x-1/2 -translate-y-1/2" ref={text2Ref} />
    </>
  );
};

const SvgFilters = () => (
  <svg id="filters" className="hidden" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
0 1 0 0 0
0 0 1 0 0
0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
);

const MorphingText = ({ texts, className }: MorphingTextProps) => (
  <div
    className={cn(
      "relative mx-auto h-[clamp(5rem,18vw,12rem)] w-full max-w-6xl text-center font-sans text-[clamp(3.25rem,11vw,9rem)] font-black uppercase leading-none tracking-[0.06em] [filter:url(#threshold)_blur(0.6px)]",
      className,
    )}
  >
    <Texts texts={texts} />
    <SvgFilters />
  </div>
);

export { MorphingText };
