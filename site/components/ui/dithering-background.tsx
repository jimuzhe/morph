"use client";

import { Dithering } from "@paper-design/shaders-react";

export function DitheringBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#120500]">
      <div className="absolute left-0 top-0 h-full w-full opacity-80">
        <Dithering
          colorBack="#120500"
          colorFront="#EC4E02"
          shape="warp"
          type="4x4"
          speed={0.35}
          className="size-full"
          minPixelRatio={1}
        />
      </div>
      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(236,78,2,0.92)_0%,rgba(236,78,2,0.42)_34%,rgba(236,78,2,0.12)_54%,transparent_72%)]" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#EC4E02]/35 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[#EC4E02]/30 blur-3xl" />
      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.12)_42%,rgba(0,0,0,0.72)_88%)]" />
      <div className="absolute bottom-0 left-0 h-48 w-full bg-gradient-to-b from-transparent via-black/50 to-black" />
    </div>
  );
}
