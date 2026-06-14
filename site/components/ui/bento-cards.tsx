"use client";

import React from "react";
import { cn } from "@/lib/utils";

const cardContents = [
  {
    title: "Edit HTML Like Slides",
    description:
      "Open a local .html file or any live webpage, click the extension icon, and start editing right on the page. No DevTools, no code — just direct visual control.",
    area: "bento-c0",
  },
  {
    title: "iOS-Style Floating Toolbar",
    description:
      "A glassmorphism capsule toolbar floats at the bottom, draggable and edge-snappable. Collapse it into an orb when you need more canvas space.",
    area: "bento-c1",
  },
  {
    title: "Select, Move, Refine",
    description:
      "Click to select, drag to reposition, resize handles to scale, double-click to edit copy, and upload to replace images. Full undo/redo and a property panel included.",
    area: "bento-c2",
  },
  {
    title: "AI Assistant In Place",
    description:
      "Describe the change you want in plain language and Morph applies HTML edits directly on the page. Pick a specific element, iterate fast, and revert anytime.",
    area: "bento-c3",
  },
  {
    title: "Save Locally, Export Anytime",
    description:
      "Link local files to their original path for quick saves. Online pages are localized into an editable copy first, then exported back as HTML with Cmd/Ctrl+S.",
    area: "bento-c4",
  },
];

const PlusCard: React.FC<{
  className?: string;
  title: string;
  description: string;
}> = ({ className = "", title, description }) => {
  return (
    <div
      className={cn(
        "relative flex h-fit flex-col justify-start self-start rounded-lg border border-dashed border-white/25 bg-white/[0.03] p-5 backdrop-blur-sm",
        "transition-colors duration-300 hover:border-[#EC4E02]/40 hover:bg-white/[0.05]",
        className
      )}
    >
      <CornerPlusIcons />
      <div className="relative z-10 space-y-1.5">
        <h3 className="text-lg font-bold text-white md:text-xl">{title}</h3>
        <p className="text-sm leading-snug text-white/58">{description}</p>
      </div>
    </div>
  );
};

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -left-3 -top-3" />
    <PlusIcon className="absolute -right-3 -top-3" />
    <PlusIcon className="absolute -bottom-3 -left-3" />
    <PlusIcon className="absolute -bottom-3 -right-3" />
  </>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    strokeWidth="1"
    stroke="currentColor"
    className={cn("size-6 text-white/70", className)}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

export function BentoCards() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-8">
      <div className="container mx-auto w-full max-w-7xl">
        <div className="mb-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff9a6c]">Core Features</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
            Not another page builder — an editor built into the page.
          </h2>
        </div>

        <div className="bento-grid">
          {cardContents.map((card) => (
            <PlusCard
              key={card.title}
              title={card.title}
              description={card.description}
              className={card.area}
            />
          ))}
        </div>

        <div className="bento-heading ml-auto mt-6 max-w-2xl px-4 text-right">
          <h2 className="mb-4 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
            Built for editing. Designed to save time.
          </h2>
          <p className="text-lg text-white/52">
            Morph connects select, move, rewrite, swap, AI edits, and save into one smooth flow.
            Open a page, click the extension, and start laying things out like a presentation.
          </p>
        </div>
      </div>
    </div>
  );
}
