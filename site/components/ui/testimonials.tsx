"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    quote: "I finally stopped bouncing between Figma and code for landing page prototypes. I open the HTML, drag elements, tweak copy, and send the file to clients.",
    author: "Sarah Chen",
    role: "Independent Visual Designer",
    avatar:
      "https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 2,
    quote: "When a campaign page needs a last-minute headline or image swap, I used to wait on engineering. Now I select the element, make the change, and undo if needed.",
    author: "Marcus Johnson",
    role: "Growth Operations Lead",
    avatar:
      "https://plus.unsplash.com/premium_photo-1671656349218-5218444643d8?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 3,
    quote: "The AI assistant shines when I can point at a block and say 'turn this into a three-column card layout.' It applies the HTML directly, and it's more reliable than I expected.",
    author: "Elena Rodriguez",
    role: "Frontend Engineer",
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=200&auto=format&fit=crop",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedQuote, setDisplayedQuote] = useState(testimonials[0].quote);
  const [displayedRole, setDisplayedRole] = useState(testimonials[0].role);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (index === activeIndex || isAnimating) return;
    setIsAnimating(true);

    setTimeout(() => {
      setDisplayedQuote(testimonials[index].quote);
      setDisplayedRole(testimonials[index].role);
      setActiveIndex(index);
      setTimeout(() => setIsAnimating(false), 400);
    }, 200);
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="flex w-full max-w-3xl flex-col items-center gap-10 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff9a6c]">What People Say</p>

        <div className="relative px-8">
          <span className="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-7xl text-white/[0.06]">
            &quot;
          </span>

          <p
            className={cn(
              "max-w-2xl text-center text-xl font-light leading-relaxed text-white transition-all duration-[400ms] ease-out md:text-2xl",
              isAnimating ? "scale-[0.98] opacity-0 blur-sm" : "scale-100 opacity-100 blur-0",
            )}
          >
            {displayedQuote}
          </p>

          <span className="pointer-events-none absolute -bottom-8 -right-2 select-none font-serif text-7xl text-white/[0.06]">
            &quot;
          </span>
        </div>

        <div className="mt-2 flex flex-col items-center gap-6">
          <p
            className={cn(
              "text-xs uppercase tracking-[0.2em] text-white/45 transition-all duration-500 ease-out",
              isAnimating ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            {displayedRole}
          </p>

          <div className="flex items-center justify-center gap-2">
            {testimonials.map((testimonial, index) => {
              const isActive = activeIndex === index;
              const isHovered = hoveredIndex === index && !isActive;
              const showName = isActive || isHovered;

              return (
                <button
                  key={testimonial.id}
                  type="button"
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-0 rounded-full",
                    "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isActive ? "bg-white shadow-lg" : "bg-transparent hover:bg-white/10",
                    showName ? "py-2 pl-2 pr-4" : "p-0.5",
                  )}
                >
                  <div className="relative shrink-0">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className={cn(
                        "h-8 w-8 rounded-full object-cover",
                        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        isActive ? "ring-2 ring-black/20" : "ring-0",
                        !isActive && "hover:scale-105",
                      )}
                    />
                  </div>

                  <div
                    className={cn(
                      "grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      showName ? "ml-2 grid-cols-[1fr] opacity-100" : "ml-0 grid-cols-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <span
                        className={cn(
                          "block whitespace-nowrap text-sm font-medium transition-colors duration-300",
                          isActive ? "text-black" : "text-white",
                        )}
                      >
                        {testimonial.author}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
