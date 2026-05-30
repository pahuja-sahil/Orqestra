import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Link } from "react-router-dom"
import { Link2, CheckCircle, AlertCircle, RefreshCw, Zap, X, Clock, GitBranch, GitPullRequest } from "lucide-react"
import api from "@/lib/api"

interface Integration {
  id: string
  api_name: string
  status: string
  failure_count: number
  last_checked: string | null
  repo_url?: string
}

export default function OverviewPage() {
  const { isDark } = useThemeStore()
  const { user, accessToken } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem("onboarding_dismissed")

    const checkGithub = async () => {
      try {
        const res = await api.get("/api/github/status", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        setGithubConnected(res.data.connected)
        if (!res.data.connected && !dismissed) setShowOnboarding(true)
      } catch {
        if (!dismissed) setShowOnboarding(true)
      }
    }

    const fetchIntegrations = async () => {
      try {
        const res = await api.get("/api/integrations", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        setIntegrations(res.data)
      } catch {
        console.error("Failed to fetch integrations")
      } finally {
        setLoadingStats(false)
      }
    }

    checkGithub()
    fetchIntegrations()
  }, [])

  const total   = integrations.length
  const healthy = integrations.filter(i => i.status === "healthy").length
  const broken  = integrations.filter(i => i.status === "broken").length
  const healing = integrations.filter(i => i.status === "healing").length
  const pending = integrations.filter(i => i.status === "pr_pending").length

  const stats = [
    { icon: Link2,       label: "Total Integrations", value: total,   color: "blue"   },
    { icon: CheckCircle, label: "Healthy",             value: healthy, color: "green"  },
    { icon: GitPullRequest, label: "PR Pending",       value: pending, color: "indigo" },
    { icon: RefreshCw,   label: "Self-Healing",        value: healing, color: "amber"  },
    { icon: AlertCircle, label: "Broken",              value: broken,  color: "red"    },
  ]

  const colorMap: Record<string, string> = {
    blue:   isDark ? "text-blue-400 bg-blue-950/40"      : "text-blue-600 bg-blue-50",
    green:  isDark ? "text-green-400 bg-green-950/40"    : "text-green-600 bg-green-50",
    red:    isDark ? "text-violet-400 bg-violet-950/40"  : "text-violet-600 bg-violet-50",
    amber:  isDark ? "text-amber-400 bg-amber-950/40"    : "text-amber-600 bg-amber-50",
    indigo: isDark ? "text-indigo-400 bg-indigo-950/40"  : "text-indigo-600 bg-indigo-50",
  }

  const statusColor = (status: string) => {
    if (status === "healthy")    return isDark ? "text-green-400"  : "text-green-600"
    if (status === "healing")    return isDark ? "text-yellow-400" : "text-yellow-600"
    if (status === "pr_pending") return isDark ? "text-blue-400"   : "text-blue-600"
    return isDark ? "text-red-400" : "text-red-600"
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col theme-root">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">
          Welcome back, {user?.name?.split(" ")[0] || "Developer"} 👋
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Here's what's happening with your integrations
        </p>
      </motion.div>

      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5 mb-6 bg-[var(--bg-card)] border-[var(--border)] shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">
                Complete your setup
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                A few steps to unlock the full power of ORQESTRA
              </p>
            </div>
            <button
              onClick={() => { setShowOnboarding(false); localStorage.setItem("onboarding_dismissed", "true") }}
              className="p-1 rounded-lg text-[var(--text-muted)] opacity-50 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: "Create your account", done: true },
              { label: "ORQESTRA AI is ready", done: true },
              {
                label: "Connect GitHub to enable repo integration & PR creation",
                done: githubConnected,
                action: !githubConnected ? (
                  <a href="/dashboard/settings" className={`text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-accent)] ${
                    isDark ? "hover:bg-violet-950/40" : "hover:bg-violet-50"
                  }`}>Connect →</a>
                ) : null
              },
            ].map(({ label, done, action }, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={14} className={done ? "text-green-500" : isDark ? "text-slate-700" : "text-slate-300"} />
                  <span className={`text-xs ${done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>
                    {label}
                  </span>
                </div>
                {action}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`p-5 rounded-2xl border bg-[var(--bg-card)] border-[var(--border)] ${
              isDark ? "hover:border-violet-500/60" : "hover:border-violet-300 hover:shadow-md hover:shadow-violet-100/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold mb-1 text-[var(--text-primary)]">
              {loadingStats ? "—" : value}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Integrations list or empty state */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="rounded-2xl border flex-1 bg-[var(--bg-card)] border-[var(--border)] shadow-2xl"
      >
        {loadingStats ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-7 h-7 border-2 border-t-transparent rounded-full border-[var(--text-accent)]"
            />
          </div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[var(--bg-element)]">
              <Zap size={28} className="text-[var(--text-accent)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              No integrations yet
            </h3>
            <p className="text-sm mb-6 max-w-sm text-[var(--text-muted)]">
              Tell ORQESTRA which API you want to integrate and it will handle everything automatically
            </p>
            <Link
              to="/dashboard/converse"
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white ${
                isDark ? "bg-violet-700 hover:bg-violet-600" : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              <Zap size={15} />
              Create First Integration
            </Link>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-sm font-semibold mb-4 text-[var(--text-muted)]">
              RECENT INTEGRATIONS
            </h2>
            <div className="space-y-3">
              {integrations.slice(0, 8).map((integration, i) => (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-element)]/40 ${
                    isDark ? "hover:bg-white/[0.06]" : "hover:bg-violet-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-element)]">
                      <Link2 size={14} className="text-[var(--text-accent)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                        {integration.api_name}
                      </p>
                      {integration.repo_url && (
                        <p className="text-xs truncate flex items-center gap-1 text-[var(--text-muted)]">
                          <GitBranch size={9} />
                          {integration.repo_url.replace("https://github.com/", "")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {integration.last_checked && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock size={10} />
                        {new Date(integration.last_checked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className={`text-xs font-semibold ${statusColor(integration.status)}`}>
                      {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            {integrations.length > 8 && (
              <Link
                to="/dashboard/integrations"
                className="block text-center text-xs font-medium mt-4 text-[var(--text-muted)] hover:text-[var(--text-accent)]"
              >
                View all {integrations.length} integrations →
              </Link>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}