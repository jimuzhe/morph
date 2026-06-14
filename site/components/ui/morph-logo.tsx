import { cn } from "@/lib/utils";
import { MorphMark } from "@/components/ui/morph-mark";

type MorphLogoProps = {
  className?: string;
  variant?: "white" | "black";
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function MorphLogo({
  className,
  variant = "white",
  showWordmark = false,
  wordmarkClassName,
}: MorphLogoProps) {
  return (
    <span className={cn("inline-flex flex-nowrap items-center gap-2.5 whitespace-nowrap", showWordmark && "gap-3")}>
      <MorphMark className={cn("size-8 shrink-0", className)} color={variant} />
      {showWordmark ? (
        <span
          className={cn(
            "shrink-0 text-base font-bold leading-none tracking-[-0.03em] text-white md:text-lg",
            wordmarkClassName,
          )}
        >
          morph
        </span>
      ) : null}
    </span>
  );
}
