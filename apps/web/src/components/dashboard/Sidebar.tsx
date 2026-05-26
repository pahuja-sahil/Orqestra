import { NavLink, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import {
  LayoutDashboard, Link2, Bot, ScrollText,
  MessageSquare, Settings, Zap, LogOut
} from "lucide-react"
import api from "@/lib/api"

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: Link2, label: "Integrations", path: "/dashboard/integrations" },
  { icon: Bot, label: "Agents", path: "/dashboard/agents" },
  { icon: ScrollText, label: "Logs", path: "/dashboard/logs" },
  { icon: MessageSquare, label: "Converse", path: "/dashboard/converse" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
]

export default function Sidebar() {
  const { isDark } = useThemeStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout")
    } finally {
      logout()
      navigate("/auth/login")
    }
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed left-0 top-0 h-full w-64 flex flex-col border-r z-40 transition-all duration-500 ${
        isDark
          ? "bg-zinc-950/90 border-violet-700/50 shadow-[2px_0_10px_rgba(124,58,237,0.2)]"
          : "bg-[#FDFBF7] border-violet-200/60 shadow-[2px_0_10px_rgba(139,92,246,0.08)]"
      }`}
    >
      <div className={`flex items-center gap-3 px-6 py-5 border-b transition-all duration-700`}>
        <motion.div
          whileHover={{ rotate: 10 }}
          transition={{ duration: 0.2 }}
          className={`p-2 rounded-xl ${isDark ? "bg-violet-950/60" : "bg-violet-50"}`}
        >
          <Zap size={16} className={isDark ? "text-violet-500" : "text-violet-600"} />
        </motion.div>
        <span className={`font-bold text-lg tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          ORQESTRA
        </span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ icon: Icon, label, path }, i) => (
          <motion.div
            key={path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <NavLink
              to={path}
              end={path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? isDark
                      ? "bg-violet-950/60 text-violet-300 border border-violet-800/60 shadow-lg shadow-violet-950/30"
                      : "bg-violet-50 text-violet-700 border border-violet-200 shadow-sm"
                    : isDark
                      ? "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                      : "text-slate-500 hover:text-violet-700 hover:bg-violet-50/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={isActive
                      ? isDark ? "text-violet-400" : "text-violet-600"
                      : ""}
                  />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={`ml-auto w-1.5 h-1.5 rounded-full ${
                        isDark ? "bg-violet-500" : "bg-violet-500"
                      }`}
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className={`px-3 py-4 border-t transition-all duration-700`}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 border ${
          isDark ? "bg-zinc-950/80 border-violet-700/50 shadow-md shadow-violet-950/20" : "bg-violet-50/60 border-violet-200/80 shadow-md shadow-violet-100/40"
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isDark
              ? "bg-gradient-to-br from-violet-900 to-violet-950 text-violet-300 border border-violet-800/50"
              : "bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 border border-violet-200"
          }`}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              {user?.name || "User"}
            </p>
            <p className={`text-xs truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {user?.email || ""}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border ${
            isDark
              ? "border-violet-950/50 text-violet-400/80 hover:text-violet-300 hover:bg-violet-950/40 hover:border-violet-800/60"
              : "border-violet-100 text-violet-500 hover:text-violet-700 hover:bg-violet-50 hover:border-violet-300"
          }`}
        >
          <LogOut size={16} />
          Sign out
        </motion.button>
      </div>
    </motion.aside>
  )
}
