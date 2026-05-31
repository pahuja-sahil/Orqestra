import { NavLink, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { toast } from "sonner"
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
      toast.success("Logged out successfully")
    } catch {
      toast.error("Failed to log out")
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
      className="fixed left-0 top-0 h-full w-64 flex flex-col border-r z-40 bg-(--bg-sidebar) border-(--border) shadow-(--shadow)"
    >
      <div className="flex items-center gap-3 px-7 py-5  border-(--border)">
        <motion.div
          whileHover={{ rotate: 10 }}
          transition={{ duration: 0.2 }}
          className="p-2 rounded-xl bg-(--bg-element)"
        >
          <Zap size={16} className="text-(--text-accent)" />
        </motion.div>
        <span className="font-bold text-lg tracking-tight text-(--text-primary)">
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
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-(--bg-element) text-(--text-accent) border border-(--border) shadow-(--shadow)"
                    : "text-(--text-muted) hover:text-(--text-accent) hover:bg-(--bg-element)"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={isActive ? "text-(--text-accent)" : ""}
                  />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="px-3 py-4  border-(--border)">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2 border bg-(--bg-element) border-(--border) shadow-(--shadow)">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
            isDark
              ? "bg-linear-to-br from-violet-900 to-violet-950 text-violet-300 border border-violet-800/50"
              : "bg-linear-to-br from-violet-100 to-violet-50 text-violet-700 border border-violet-200"
          }`}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-(--text-primary)">
              {user?.name || "User"}
            </p>
            <p className="text-xs truncate text-(--text-muted)">
              {user?.email || ""}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border bg-(--bg-element) border-(--border) text-(--text-muted) ${
            isDark
              ? "hover:text-violet-300 hover:bg-violet-950/40 hover:border-violet-800/60"
              : "hover:text-violet-700 hover:bg-violet-50 hover:border-violet-300"
          }`}
        >
          <LogOut size={16} />
          Sign out
        </motion.button>
      </div>
    </motion.aside>
  )
}
