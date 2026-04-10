import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Link2, CheckCircle, AlertCircle, RefreshCw, Zap } from "lucide-react"

const stats = [
  { icon: Link2, label: "Total Integrations", value: "0", color: "blue" },
  { icon: CheckCircle, label: "Healthy", value: "0", color: "green" },
  { icon: AlertCircle, label: "Broken", value: "0", color: "red" },
  { icon: RefreshCw, label: "Self-Healing", value: "0", color: "amber" },
]

export default function OverviewPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()

  const colorMap: Record<string, string> = {
    blue: isDark ? "text-blue-400 bg-blue-950/40" : "text-blue-600 bg-blue-50",
    green: isDark ? "text-green-400 bg-green-950/40" : "text-green-600 bg-green-50",
    red: isDark ? "text-red-400 bg-red-950/40" : "text-red-600 bg-red-50",
    amber: isDark ? "text-amber-400 bg-amber-950/40" : "text-amber-600 bg-amber-50",
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
          Welcome back, {user?.name?.split(" ")[0] || "Developer"} 👋
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Here's what's happening with your integrations
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`p-5 rounded-2xl border transition-all duration-200 ${
              isDark
                ? "border-red-700/50 bg-[#090004]/80 shadow-xl shadow-red-950/30 hover:border-red-500/60"
                : "border-red-200/80 bg-white hover:shadow-md hover:shadow-red-100/50 hover:border-red-300"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon size={18} />
            </div>
            <p className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
              {value}
            </p>
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              {label}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className={`rounded-2xl border p-8 flex flex-col items-center justify-center text-center flex-1 ${
          isDark
            ? "border-red-700/50 bg-[#090004]/80 shadow-2xl shadow-red-950/30"
            : "border-red-200/80 bg-white shadow-2xl shadow-red-100/40"
        }`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          isDark ? "bg-red-950/50" : "bg-red-50"
        }`}>
          <Zap size={28} className={isDark ? "text-red-500" : "text-red-600"} />
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          No integrations yet
        </h3>
        <p className={`text-sm mb-6 max-w-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Tell NEXUS which API you want to integrate and it will handle everything automatically
        </p>
        <button className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 ${
          isDark
            ? "bg-red-700 text-white hover:bg-red-600"
            : "bg-red-600 text-white hover:bg-red-500"
        }`}>
          <Zap size={15} />
          Create First Integration
        </button>
      </motion.div>
    </div>
  )
}