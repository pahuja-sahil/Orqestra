import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { Sun, Moon, Menu, X } from "lucide-react"

const NAV_ITEMS = ["Features", "About Us"]

function scrollTo(href: string) {
  const id = href.replace("#", "")
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth" })
}

export function Navbar() {
  const navigate = useNavigate()
  const { isDark, toggle } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  const handleNavClick = (href: string) => {
    closeMobile()
    scrollTo(href)
  }

  const handleGetStarted = () => {
    closeMobile()
    navigate("/auth/login")
  }

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 sm:px-8 py-4 transition-all duration-500 ${
          isDark
            ? "bg-black/20 border-b border-violet-950/30 backdrop-blur-md"
            : "bg-white/20 border-b border-violet-100/50 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
            <img src="/webhook.svg" alt="Orqestra Logo" className="w-5 h-5" />
          </div>
          <span className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            ORQESTRA
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              whileHover={{ y: -1 }}
              className={`text-sm font-medium transition-colors duration-200 ${
                isDark
                  ? "text-slate-400 hover:text-violet-400"
                  : "text-slate-600 hover:text-violet-600"
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
                ? "border-violet-500 bg-violet-950/40 text-violet-400 hover:bg-violet-900/50 hover:border-violet-700"
                : "border-violet-200 bg-violet-50/50 text-violet-600 hover:bg-violet-100 hover:border-violet-300"
            }`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors duration-200 ${
              isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/auth/login")}
            className={`hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              isDark
                ? "bg-violet-700 text-white hover:bg-violet-600 shadow-lg shadow-violet-900/30"
                : "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-200/50"
            }`}
          >
            Get Started
          </motion.button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-[65px] left-0 right-0 z-[99] flex flex-col gap-2 px-6 pb-6 pt-4 border-b backdrop-blur-xl md:hidden ${
              isDark
                ? "bg-zinc-950/95 border-violet-950/30"
                : "bg-white/95 border-violet-100/50"
            }`}
          >
            {NAV_ITEMS.map((item, i) => (
              <motion.a
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(`#${item.toLowerCase().replace(" ", "-")}`) }}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                  isDark
                    ? "text-slate-400 hover:text-violet-400 hover:bg-violet-950/40"
                    : "text-slate-600 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                {item}
              </motion.a>
            ))}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className={`mt-2 px-5 py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 ${
                isDark
                  ? "bg-violet-700 text-white hover:bg-violet-600"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              }`}
            >
              Get Started
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
