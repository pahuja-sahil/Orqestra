import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Link } from "react-router-dom"
import {
  Link2, Trash2, RefreshCw, ExternalLink,
  CheckCircle, XCircle, GitPullRequest, Clock, GitBranch, MessageSquare,
  AlertTriangle, ArrowRight, X, Code
} from "lucide-react"
import api from "@/lib/api"

const TRANSITION = "transition-all duration-500 ease-in-out"

interface Integration {
  id: string
  name: string
  api_name: string
  status: "healthy" | "healing" | "pr_pending" | "broken"
  circuit_state: string
  failure_count: number
  repair_attempts?: number
  last_checked: string | null
  last_repaired?: string | null
  created_at: string
  repo_url?: string
  file_path?: string
  pr_url?: string
  health_check?: string | null
  language?: string
  generated_code?: string | null
  updated_at?: string | null
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
    pr_pending: {
      icon: GitPullRequest,
      label: "PR Awaiting Merge",
      color: isDark ? "text-blue-400 bg-blue-950/40 border-blue-800/50"
                    : "text-blue-700 bg-blue-50 border-blue-200"
    },
  }

  const cfg = config[status as keyof typeof config] || config.healthy
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.color} ${TRANSITION}`}>
      <Icon size={12} className={status === "healing" ? "animate-spin" : status === "pr_pending" ? "animate-pulse" : ""} />
      {cfg.label}
    </span>
  )
}

function DetailPanel({
  integration,
  isDark,
  onClose,
}: {
  integration: Integration
  isDark: boolean
  onClose: () => void
}) {
  const statusSteps = [
    { key: "healthy", label: "Healthy", icon: CheckCircle },
    { key: "healing", label: "Healing", icon: RefreshCw },
    { key: "pr_pending", label: "PR Pending", icon: GitPullRequest },
    { key: "broken", label: "Broken", icon: XCircle },
  ]

  const currentIdx = statusSteps.findIndex(s => s.key === integration.status)

  const failurePct = Math.min((integration.failure_count / 2) * 100, 100)
  const repairDots = Math.min(integration.repair_attempts ?? 0, 3)

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return "—"
    return new Date(ts).toLocaleString()
  }

  const timeAgo = (ts: string | null | undefined) => {
    if (!ts) return "—"
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border p-6 shadow-lg bg-[var(--bg-card)] border-[var(--border)]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <StatusBadge status={integration.status} isDark={isDark} />
          <h2 className="text-xl font-bold mt-3 text-[var(--text-primary)]">
            {integration.api_name || integration.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]">
            {integration.file_path && (
              <span className="flex items-center gap-1 font-mono">
                <Code size={11} />
                {integration.file_path}
              </span>
            )}
            {integration.language && <span>{integration.language}</span>}
            {integration.repo_url && (
              <a
                href={integration.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 hover:underline ${
                  isDark ? "hover:text-violet-400" : "hover:text-violet-600"
                }`}
              >
                <GitBranch size={11} />
                {integration.repo_url.replace("https://github.com/", "")}
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: AlertTriangle, label: "Failures", value: integration.failure_count, color: "red" },
            { icon: RefreshCw, label: "Repairs", value: integration.repair_attempts ?? 0, color: "amber" },
            { icon: Clock, label: "Last Check", value: timeAgo(integration.last_checked), color: "blue" },
          ].map((stat) => (
            <div
              key={stat.label}
            className="rounded-2xl border p-3.5 bg-[var(--bg-element)] border-[var(--border)]"
          >
            <div className="flex items-center gap-1.5 text-xs mb-1 text-[var(--text-muted)]">
              <stat.icon size={12} className={
                stat.color === "red" ? (isDark ? "text-red-400" : "text-red-500") :
                stat.color === "amber" ? (isDark ? "text-amber-400" : "text-amber-500") :
                (isDark ? "text-blue-400" : "text-blue-500")
              } />
              {stat.label}
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {stat.value}
            </p>
            </div>
          ))}
        </div>

        {/* Health Meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2 text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={12} className={integration.failure_count >= 2 ? (isDark ? "text-red-400" : "text-red-500") : (isDark ? "text-amber-400" : "text-amber-500")} />
              Health Meter
            </span>
            <span>{integration.failure_count} / 2 failures</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-element)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${failurePct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${failurePct >= 100 ? "bg-red-500" : failurePct >= 50 ? "bg-amber-500" : "bg-green-500"}`}
            />
          </div>
        </div>

        {/* Repair Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2 text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} className={isDark ? "text-amber-400" : "text-amber-500"} />
              Repair Progress
            </span>
            <span>{repairDots} / 3 attempts</span>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500 ${
                  i < repairDots
                    ? isDark
                      ? "bg-amber-950/40 border-amber-600 text-amber-400"
                      : "bg-amber-50 border-amber-500 text-amber-700"
                    : "bg-transparent border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="mb-6">
          <p className="text-xs mb-3 flex items-center gap-1.5 text-[var(--text-muted)]">
            <RefreshCw size={12} className="text-[var(--text-accent)]" />
            Status Pipeline
          </p>
          <div className="flex items-center gap-0">
            {statusSteps.map((step, i) => {
              const isActive = i === currentIdx
              const isPast = i < currentIdx
              const StepIcon = step.icon
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isActive
                          ? "bg-[var(--bg-element)] border-[var(--text-accent)] text-[var(--text-accent)] scale-110"
                          : isPast
                          ? isDark
                            ? "bg-green-950/40 border-green-700/50 text-green-500"
                            : "bg-green-50 border-green-400 text-green-600"
                          : "bg-transparent border-[var(--border)] text-[var(--text-muted)]"
                      }`}
                    >
                      <StepIcon size={14} className={isActive ? "animate-pulse" : ""} />
                    </div>
                    <span className={`text-[10px] mt-1 text-center leading-tight max-w-[60px] ${
                      isActive
                        ? "text-[var(--text-accent)] font-semibold"
                        : isPast
                        ? isDark ? "text-green-500" : "text-green-600"
                        : "text-[var(--text-muted)]"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <ArrowRight size={12} className="flex-shrink-0 -mx-1 text-[var(--border)]" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Last Error */}
        {integration.health_check && (
          <div className="mb-6">
            <p className="text-xs mb-2 flex items-center gap-1.5 text-[var(--text-muted)]">
              <AlertTriangle size={12} className={isDark ? "text-red-400" : "text-red-500"} />
              Last Error
            </p>
            <div className="rounded-2xl border p-3 text-xs font-mono leading-relaxed bg-red-950/20 border-red-950/40 text-red-300">
              {integration.health_check}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-[var(--text-muted)]">
          <div>
            <span className="block">Created</span>
            <span className="text-[var(--text-primary)]">{formatTime(integration.created_at)}</span>
          </div>
          <div>
            <span className="block">Last Repaired</span>
            <span className="text-[var(--text-primary)]">{formatTime(integration.last_repaired)}</span>
          </div>
        </div>

        {/* PR Link */}
        {integration.pr_url && (
          <a
            href={integration.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold border-2 ${
              isDark
                ? "border-blue-800 bg-blue-950/30 text-blue-400 hover:bg-blue-950/50"
                : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <GitPullRequest size={15} />
            View Pull Request
            <ExternalLink size={12} />
          </a>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function IntegrationsPage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Integration | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const prevStatuses = useRef<Record<string, string>>({})

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/api/integrations", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = res.data as Integration[]

      data.forEach((integration: Integration) => {
        const prev = prevStatuses.current[integration.id]
        if (prev && prev !== integration.status) {
          const name = integration.api_name || integration.name
          if (integration.status === "healing") {
            toast.info(`Self-healing started for ${name}`)
          } else if (integration.status === "broken") {
            toast.error(`${name} is unreachable after repairs`)
          } else if (integration.status === "healthy") {
            toast.success(`${name} recovered successfully`)
          }
        }
        prevStatuses.current[integration.id] = integration.status
      })

      setIntegrations(data)
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

  const fetchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/api/integrations/${id}/health`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setDetailData(res.data)
    } catch {
      console.error("Failed to fetch integration detail")
    } finally {
      setDetailLoading(false)
    }
  }

  const openDetail = (id: string) => {
    setSelectedId(id)
    fetchDetail(id)
  }

  const closeDetail = () => {
    setSelectedId(null)
    setDetailData(null)
  }

  const handleDelete = async (id: string) => {
    const integration = integrations.find(i => i.id === id)
    const name = integration?.api_name || "Integration"
    toast.promise(
      api.delete(`/api/integrations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      {
        loading: `Removing ${name}...`,
        success: () => {
          setIntegrations(prev => prev.filter(i => i.id !== id))
          return `Removed ${name}`
        },
        error: "Failed to remove integration",
      }
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-4xl mx-auto w-full theme-root"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
            Integrations
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Live health status of all integrations created via ORQESTRA — monitored and self-healed automatically
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-t-transparent rounded-full border-[var(--text-accent)]"
            />
          </div>

        ) : integrations.length === 0 ? (
          // Empty state — guide user to Converse
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border p-16 text-center bg-[var(--bg-card)] border-[var(--border)] shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[var(--bg-element)]">
              <Link2 size={28} className="text-[var(--text-accent)]" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">
              No integrations yet
            </h3>
            <p className="text-sm mb-6 max-w-sm mx-auto text-[var(--text-muted)]">
              Integrations are created when you ask ORQESTRA to integrate an API in the Converse page and approve the PR.
            </p>
            <Link
              to="/dashboard/converse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
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
                onClick={() => openDetail(integration.id)}
                className={`rounded-2xl border p-5 cursor-pointer bg-[var(--bg-card)] border-[var(--border)] ${
                  isDark ? "hover:border-violet-800/60 hover:bg-[#12001a]/80" : "hover:border-violet-300 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: icon + name + meta */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--bg-element)]">
                      <Link2 size={18} className="text-[var(--text-accent)]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        {integration.api_name}
                      </h3>
                      {/* Repo URL */}
                      {integration.repo_url && (
                        <a
                          href={integration.repo_url.startsWith("http") ? integration.repo_url : `https://github.com/${integration.repo_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs mt-0.5 truncate max-w-xs text-[var(--text-muted)] hover:text-[var(--text-accent)]"
                        >
                          <GitBranch size={10} />
                          {integration.repo_url.replace("https://github.com/", "")}
                          <ExternalLink size={9} />
                        </a>
                      )}
                      {/* Target file */}
                      {integration.file_path && (
                        <p className="text-xs mt-0.5 font-mono text-[var(--text-muted)]">
                          {integration.file_path}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: status + last checked + failures + delete */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={integration.status} isDark={isDark} />

                    {integration.last_checked && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)]">
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
                      onClick={(e) => { e.stopPropagation(); handleDelete(integration.id) }}
                      title="Remove integration"
                      className={`p-2 rounded-xl text-[var(--text-muted)] opacity-50 ${
                        isDark ? "hover:text-red-400 hover:bg-red-950/30" : "hover:text-red-500 hover:bg-red-50"
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

      {/* Detail Panel Modal */}
      {selectedId && detailData && (
        <DetailPanel
          integration={detailData}
          isDark={isDark}
          onClose={closeDetail}
        />
      )}
    </>
  )
}