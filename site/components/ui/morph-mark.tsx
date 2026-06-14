import { cn } from "@/lib/utils";

const MARK_PATH =
  "M1025 2603 c-111 -17 -258 -75 -332 -129 -164 -121 -250 -241 -331 -459 l-26 -70 -3 -515 c-3 -501 -3 -516 17 -547 19 -32 22 -33 85 -33 51 0 69 4 84 19 48 48 48 49 55 551 6 379 10 486 23 530 43 156 148 290 281 359 106 56 275 69 393 32 110 -35 180 -88 369 -281 204 -208 245 -266 244 -349 0 -99 -49 -151 -139 -151 -52 0 -114 68 -200 219 -85 151 -144 225 -215 273 -69 46 -126 63 -215 63 -89 0 -166 -35 -226 -103 -157 -179 -140 -408 50 -660 85 -111 261 -294 336 -347 63 -45 179 -105 203 -105 8 0 28 -7 45 -14 81 -37 274 -47 402 -21 161 34 310 117 428 240 89 95 118 136 173 250 69 144 89 234 88 400 0 153 -12 218 -64 354 -36 92 -110 210 -178 283 -129 138 -342 239 -443 209 -53 -16 -89 -62 -89 -115 0 -59 42 -97 135 -125 82 -24 148 -63 206 -123 181 -187 241 -469 154 -721 -65 -190 -222 -343 -412 -403 -69 -22 -228 -29 -294 -14 -111 25 -197 76 -289 169 -119 121 -248 285 -282 357 -56 121 -38 227 44 248 77 19 124 -20 212 -175 118 -210 190 -294 293 -345 79 -38 198 -41 288 -5 82 32 173 124 205 206 47 124 33 275 -36 391 -44 75 -413 452 -505 517 -78 55 -171 100 -254 123 -60 16 -224 26 -280 17z";

type MorphMarkProps = {
  className?: string;
  variant?: "solid" | "gradient";
  color?: "white" | "black";
};

export function MorphMark({ className, variant = "solid", color = "white" }: MorphMarkProps) {
  const gradientId = "morph-mark-footer-fade";
  const fill =
    variant === "gradient" ? `url(#${gradientId})` : color === "white" ? "#ffffff" : "#000000";

  return (
    <svg
      viewBox="0 0 346 346"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("inline-block shrink-0 align-middle", className)}
      shapeRendering="geometricPrecision"
    >
      {variant === "gradient" ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      ) : null}
      <g transform="translate(0 346) scale(0.1 -0.1)" fill={fill}>
        <path d={MARK_PATH} />
      </g>
    </svg>
  );
}
