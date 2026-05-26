import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface LampContainerProps {
  children: React.ReactNode
  className?: string
  isDark?: boolean
}

export function LampContainer({ children, className, isDark = true }: LampContainerProps) {
  const bg = isDark ? "bg-zinc-950" : "bg-zinc-50"
  const maskBg = isDark ? "#09090b" : "#fafafa"

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden w-full transition-colors duration-500",
        bg,
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate">
        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          animate={{ opacity: 1, width: "28rem" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className={cn(
            "absolute inset-auto right-1/2 h-56 overflow-visible w-[28rem]",
            "[--conic-position:from_70deg_at_center_top]",
            isDark
              ? "bg-gradient-conic from-[#6d28d9] via-transparent to-transparent"
              : "bg-gradient-conic from-violet-300 via-transparent to-transparent",
          )}
        >
          <div
            className="absolute w-[100%] left-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)] transition-colors duration-500"
            style={{ backgroundColor: maskBg }}
          />
          <div
            className="absolute w-40 h-[100%] left-0 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)] transition-colors duration-500"
            style={{ backgroundColor: maskBg }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          animate={{ opacity: 1, width: "28rem" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className={cn(
            "absolute inset-auto left-1/2 h-56 w-[28rem] overflow-visible",
            "[--conic-position:from_290deg_at_center_top]",
            isDark
              ? "bg-gradient-conic from-transparent via-transparent to-[#6d28d9]"
              : "bg-gradient-conic from-transparent via-transparent to-violet-300"
          )}
        >
          <div
            className="absolute w-40 h-[100%] right-0 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)] transition-colors duration-500"
            style={{ backgroundColor: maskBg }}
          />
          <div
            className="absolute w-[100%] right-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)] transition-colors duration-500"
            style={{ backgroundColor: maskBg }}
          />
        </motion.div>

        <div
          className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 blur-2xl transition-colors duration-500 [mask-image:radial-gradient(ellipse_at_center_center,black,transparent_70%)]"
          style={{ backgroundColor: maskBg }}
        />

        <div
          className={cn(
            "absolute inset-auto z-50 h-36 w-[26rem] -translate-y-1/2 rounded-full opacity-50 blur-3xl transition-colors duration-500",
            isDark ? "bg-[#6d28d9]" : "bg-violet-200"
          )}
        />

        <motion.div
          initial={{ width: "6rem" }}
          animate={{ width: "14rem" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className={cn(
            "absolute inset-auto z-30 h-36 w-56 -translate-y-[6rem] rounded-full blur-2xl transition-colors duration-500",
            isDark ? "bg-[#8b5cf6]" : "bg-violet-300"
          )}
        />

        <motion.div
          initial={{ width: "10rem" }}
          animate={{ width: "26rem" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className={cn(
            "absolute inset-auto z-50 h-0.5 w-[26rem] -translate-y-[7rem] transition-colors duration-500",
            isDark ? "bg-[#8b5cf6]" : "bg-violet-400"
          )}
        />

        <div
          className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] transition-colors duration-500"
          style={{ backgroundColor: maskBg }}
        />
      </div>

      <div className="relative z-50 flex flex-col items-center px-5 -translate-y-40">
        {children}
      </div>
    </div>
  )
}