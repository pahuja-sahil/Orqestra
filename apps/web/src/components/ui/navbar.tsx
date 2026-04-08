import { motion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { Sun, Moon, Zap } from "lucide-react"

export function Navbar() {
  const navigate = useNavigate()
  const { isDark, toggle } = useThemeStore()

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 py-4 transition-all duration-500 ${
        isDark
          ? "bg-black/20 border-b border-red-950/30 backdrop-blur-md"
          : "bg-white/20 border-b border-red-100/50 backdrop-blur-md"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${isDark ? "bg-red-950/50" : "bg-red-50"}`}>
          <Zap size={18} className={isDark ? "text-red-500" : "text-red-600"} />
        </div>
        <span className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          NEXUS
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {["Features", "How It Works", "Pricing"].map((item) => (
          <motion.a
            key={item}
            href={`#${item.toLowerCase().replace(" ", "-")}`}
            whileHover={{ y: -1 }}
            className={`text-sm font-medium transition-colors duration-200 ${
              isDark
                ? "text-slate-400 hover:text-red-400"
                : "text-slate-600 hover:text-red-600"
            }`}
          >
            {item}
          </motion.a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`p-2 rounded-full border-2 transition-all duration-300 ${
            isDark
              ? "border-red-500 bg-red-950/40 text-red-400 hover:bg-red-900/50 hover:border-red-700"
              : "border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 hover:border-red-300"
          }`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/auth/login")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            isDark
              ? "bg-red-700 text-white hover:bg-red-600 shadow-lg shadow-red-900/30"
              : "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-200/50"
          }`}
        >
          Get Started
        </motion.button>
      </div>
    </motion.nav>
  )
}