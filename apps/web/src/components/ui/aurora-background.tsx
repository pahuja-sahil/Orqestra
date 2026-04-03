import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
  showRadialGradient?: boolean
  isDark?: boolean
}

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  isDark = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen items-center justify-center transition-colors duration-500",
        isDark ? "bg-[#020818]" : "bg-[#f0f6ff]",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute -inset-[10px]",
            isDark ? "opacity-60" : "opacity-30",
            "[--aurora:repeating-linear-gradient(100deg,#2563eb_5%,#7c3aed_15%,#4f46e5_25%,#3b82f6_35%,#6d28d9_45%,#2563eb_55%)]",
            "[background-image:var(--aurora)]",
            "[background-size:300%_200%]",
            "animate-[aurora_8s_linear_infinite]",
            showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_50%_50%,black_20%,transparent_80%)]"
          )}
        />
      </div>
      {children}
    </div>
  )
}