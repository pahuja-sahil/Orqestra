import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useAuthStore } from "@/store/authStore"
import {
  ScrollText, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Clock
} from "lucide-react"
import api from "@/lib/api"

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
      className="max-w-4xl mx-auto w-full theme-root"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--text-primary)] ">
            Logs
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Monitor integration health — updates every 30 seconds
          </p>
        </div>
        <motion.button
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--text-accent)] hover:bg-[var(--bg-element)]"
        >
          <RefreshCw size={16} />
        </motion.button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap">
        {(["all", "healthy", "broken", "healing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize border-[var(--border)] ${
              filter === f
                ? "bg-violet-600 text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text-accent)]"
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
            className="w-8 h-8 border-2 border-t-transparent rounded-full border-[var(--text-accent)]"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border p-16 text-center bg-[var(--bg-card)] border-[var(--border)] shadow-lg">
          <ScrollText size={32} className="mx-auto mb-4 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No logs found
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border overflow-hidden bg-[var(--bg-card)] border-[var(--border)] shadow-lg">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-semibold tracking-wider border-b text-[var(--text-muted)] border-[var(--border)]">
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
                className="grid grid-cols-5 gap-4 px-5 py-4 text-sm items-center hover:bg-[var(--bg-element)]/40"
              >
                <div className="col-span-2">
                  <p className="font-medium text-sm text-[var(--text-primary)]">
                    {log.name}
                  </p>
                  <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                    {log.api_name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon status={log.status} />
                  <span className="text-xs capitalize text-[var(--text-muted)]">
                    {log.status}
                  </span>
                </div>

                <div className="text-sm font-medium text-[var(--text-accent)]">
                  {log.failure_count}
                  {log.repair_attempts > 0 && (
                    <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                      ({log.repair_attempts} repairs)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
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