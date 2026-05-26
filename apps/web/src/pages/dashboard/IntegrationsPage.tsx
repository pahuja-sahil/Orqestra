import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Link } from "react-router-dom"
import {
  Link2, Trash2, RefreshCw, ExternalLink,
  CheckCircle, XCircle, AlertCircle, Clock, GitBranch, MessageSquare
} from "lucide-react"
import api from "@/lib/api"

const TRANSITION = "transition-all duration-500 ease-in-out"

interface Integration {
  id: string
  name: string
  api_name: string
  status: "healthy" | "broken" | "healing" | "failed"
  circuit_state: string
  failure_count: number
  last_checked: string | null
  created_at: string
  repo_url?: string
  file_path?: string
}

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const config = {
    healthy: {
      icon: CheckCircle,
      label: "Healthy",
      color: isDark ? "text-green-400 bg-green-950/40 border-green-800/50"
                    : "text-green-700 bg-green-50 border-green-200"
    },
    broken: {
      icon: XCircle,
      label: "Broken",
      color: isDark ? "text-red-400 bg-red-950/40 border-red-800/50"
                    : "text-red-700 bg-red-50 border-red-200"
    },
    healing: {
      icon: RefreshCw,
      label: "Self-healing",
      color: isDark ? "text-yellow-400 bg-yellow-950/40 border-yellow-800/50"
                    : "text-yellow-700 bg-yellow-50 border-yellow-200"
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      color: isDark ? "text-orange-400 bg-orange-950/40 border-orange-800/50"
                    : "text-orange-700 bg-orange-50 border-orange-200"
    },
  }

  const cfg = config[status as keyof typeof config] || config.healthy
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.color} ${TRANSITION}`}>
      <Icon size={12} className={status === "healing" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  )
}

export default function IntegrationsPage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/api/integrations", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setIntegrations(res.data)
    } catch {
      console.error("Failed to fetch integrations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
    // Auto-refresh every 30s so status updates are visible without a manual reload
    const interval = setInterval(fetchIntegrations, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/integrations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setIntegrations(prev => prev.filter(i => i.id !== id))
    } catch {
      console.error("Failed to delete")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${TRANSITION} ${isDark ? "text-white" : "text-slate-900"}`}>
          Integrations
        </h1>
        <p className={`text-sm ${TRANSITION} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Live health status of all integrations created via ORQESTRA — monitored and self-healed automatically
        </p>
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

      ) : integrations.length === 0 ? (
        // Empty state — guide user to Converse
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-3xl border p-16 text-center ${TRANSITION} ${
            isDark
              ? "border-violet-950/50 bg-[#0a000f]/80"
              : "border-violet-200/80 bg-white shadow-xl shadow-violet-100/40"
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            isDark ? "bg-violet-950/60" : "bg-violet-50"
          }`}>
            <Link2 size={28} className={isDark ? "text-violet-500" : "text-violet-600"} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            No integrations yet
          </h3>
          <p className={`text-sm mb-6 max-w-sm mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Integrations are created when you ask ORQESTRA to integrate an API in the Converse page and approve the PR.
          </p>
          <Link
            to="/dashboard/converse"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 ${TRANSITION} ${
              isDark
                ? "border-violet-800 bg-violet-950/50 text-violet-300 hover:bg-violet-900/60"
                : "border-violet-500 bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            <MessageSquare size={15} />
            Go to Converse
          </Link>
        </motion.div>

      ) : (
        <div className="space-y-3">
          {integrations.map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-5 ${TRANSITION} ${
                isDark
                  ? "bg-[#0a000f]/80 border-violet-950/50 hover:border-violet-800/60"
                  : "bg-white border-violet-200/80 hover:border-violet-300 shadow-sm shadow-violet-100/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: icon + name + meta */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isDark ? "bg-violet-950/60" : "bg-violet-50"
                  }`}>
                    <Link2 size={18} className={isDark ? "text-violet-400" : "text-violet-600"} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                      {integration.api_name}
                    </h3>
                    {/* Repo URL */}
                    {integration.repo_url && (
                      <a
                        href={integration.repo_url.startsWith("http") ? integration.repo_url : `https://github.com/${integration.repo_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs mt-0.5 truncate max-w-xs ${TRANSITION} ${
                          isDark ? "text-slate-500 hover:text-violet-400" : "text-slate-400 hover:text-violet-600"
                        }`}
                      >
                        <GitBranch size={10} />
                        {integration.repo_url.replace("https://github.com/", "")}
                        <ExternalLink size={9} />
                      </a>
                    )}
                    {/* Target file */}
                    {integration.file_path && (
                      <p className={`text-xs mt-0.5 font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                        {integration.file_path}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: status + last checked + failures + delete */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={integration.status} isDark={isDark} />

                  {integration.last_checked && (
                    <div className={`hidden sm:flex items-center gap-1 text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      <Clock size={10} />
                      {new Date(integration.last_checked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}

                  {integration.failure_count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${
                      isDark ? "bg-red-950/40 text-red-400" : "bg-red-50 text-red-600"
                    }`}>
                      {integration.failure_count} {integration.failure_count === 1 ? "failure" : "failures"}
                    </span>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(integration.id)}
                    title="Remove integration"
                    className={`p-2 rounded-xl ${TRANSITION} ${
                      isDark
                        ? "text-slate-700 hover:text-red-400 hover:bg-red-950/30"
                        : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}