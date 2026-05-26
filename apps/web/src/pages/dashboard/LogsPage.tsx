import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import {
  ScrollText, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Clock
} from "lucide-react"
import api from "@/lib/api"

const TRANSITION = "transition-all duration-500 ease-in-out"

interface LogEntry {
  id: string
  name: string
  api_name: string
  status: string
  failure_count: number
  repair_attempts: number
  last_checked: string | null
  last_repaired: string | null
  created_at: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle size={14} className="text-green-500" />
  if (status === "broken") return <XCircle size={14} className="text-violet-500" />
  if (status === "healing") return <RefreshCw size={14} className="text-yellow-500" />
  return <AlertCircle size={14} className="text-orange-500" />
}

export default function LogsPage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "healthy" | "broken" | "healing">("all")

  const fetchLogs = async () => {
    try {
      const res = await api.get("/api/integrations", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setLogs(res.data)
    } catch {
      console.error("Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === "all"
    ? logs
    : logs.filter(l => l.status === filter)

  const counts = {
    all: logs.length,
    healthy: logs.filter(l => l.status === "healthy").length,
    broken: logs.filter(l => l.status === "broken").length,
    healing: logs.filter(l => l.status === "healing").length,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto w-full"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${TRANSITION} ${isDark ? "text-white" : "text-slate-900"}`}>
            Logs
          </h1>
          <p className={`text-sm ${TRANSITION} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Monitor integration health — updates every 30 seconds
          </p>
        </div>
        <motion.button
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
          onClick={fetchLogs}
          className={`p-2.5 rounded-xl border ${TRANSITION} ${
            isDark
              ? "border-violet-950/50 text-violet-400 hover:bg-violet-950/40"
              : "border-violet-200 text-violet-600 hover:bg-violet-50"
          }`}
        >
          <RefreshCw size={16} />
        </motion.button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "healthy", "broken", "healing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize ${TRANSITION} ${
              filter === f
                ? isDark
                  ? "bg-violet-950/60 text-violet-300 border-violet-800/60"
                  : "bg-violet-600 text-white border-violet-500"
                : isDark
                  ? "text-slate-500 border-white/5 hover:border-violet-900/40 hover:text-slate-300"
                  : "text-slate-500 border-violet-100 hover:border-violet-200 hover:text-violet-600"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={`w-8 h-8 border-2 border-t-transparent rounded-full ${
              isDark ? "border-violet-500" : "border-violet-600"
            }`}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-3xl border p-16 text-center ${TRANSITION} ${
          isDark
            ? "border-violet-950/50 bg-[#0a000f]/80"
            : "border-violet-200/80 bg-white shadow-xl shadow-violet-100/40"
        }`}>
          <ScrollText size={32} className={`mx-auto mb-4 ${isDark ? "text-violet-900" : "text-violet-200"}`} />
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No logs found
          </p>
        </div>
      ) : (
        <div className={`rounded-3xl border overflow-hidden ${TRANSITION} ${
          isDark
            ? "border-violet-950/50 bg-[#0a000f]/80"
            : "border-violet-200/80 bg-white shadow-xl shadow-violet-100/40"
        }`}>
          {/* Table header */}
          <div className={`grid grid-cols-5 gap-4 px-5 py-3 text-xs font-semibold tracking-wider border-b ${TRANSITION} ${
            isDark
              ? "text-slate-500 border-white/5"
              : "text-slate-400 border-violet-100"
          }`}>
            <span className="col-span-2">INTEGRATION</span>
            <span>STATUS</span>
            <span>FAILURES</span>
            <span>LAST CHECKED</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-white/5">
            {filtered.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`grid grid-cols-5 gap-4 px-5 py-4 text-sm items-center ${TRANSITION} ${
                  isDark ? "hover:bg-white/2" : "hover:bg-violet-50/40"
                }`}
              >
                <div className="col-span-2">
                  <p className={`font-medium text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {log.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    {log.api_name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon status={log.status} />
                  <span className={`text-xs capitalize ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {log.status}
                  </span>
                </div>

                <div className={`text-sm font-medium ${
                  log.failure_count > 0
                    ? isDark ? "text-violet-400" : "text-violet-600"
                    : isDark ? "text-slate-500" : "text-slate-400"
                }`}>
                  {log.failure_count}
                  {log.repair_attempts > 0 && (
                    <span className={`ml-1.5 text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      ({log.repair_attempts} repairs)
                    </span>
                  )}
                </div>

                <div className={`flex items-center gap-1.5 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  <Clock size={11} />
                  {log.last_checked
                    ? new Date(log.last_checked).toLocaleTimeString()
                    : "Not yet"
                  }
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}