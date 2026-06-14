import { cn } from "@/lib/utils"

interface NavbarProps {
  className?: string
}

export function Navbar({ className }: NavbarProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-6 py-4",
        "bg-background/60 backdrop-blur-md border-b border-border/50",
        className
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Morph" className="h-7 w-7 object-contain" />
          <span className="font-semibold text-sm text-foreground">Morph</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/jimuzhe/morph"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <button
            onClick={() => window.open("https://github.com/jimuzhe/morph", "_blank")}
            className="text-sm px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            加入候补
          </button>
        </div>
      </div>
    </nav>
  )
}
