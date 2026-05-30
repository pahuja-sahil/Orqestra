import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Shield, User, Key, CheckCircle, AlertCircle, ShieldOff, XCircle } from "lucide-react"
import { IconBrandGithub as Github } from "@tabler/icons-react"
import api from "@/lib/api"

const TRANSITION = "transition-all duration-500 ease-in-out"

export default function SettingsPage() {
  const { isDark } = useThemeStore()
  const { user, accessToken, setUser } = useAuthStore()

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [step, setStep] = useState<"idle" | "scanning" | "done" | "disabling">("idle")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [nameSaving, setNameSaving] = useState(false)

  // GitHub connection state
  const [githubStatus, setGithubStatus] = useState<{
    connected: boolean
    username?: string
    avatar_url?: string
  } | null>(null)

  useEffect(() => {
    const checkGithub = async () => {
      try {
        const res = await api.get("/api/github/status", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        setGithubStatus(res.data)
      } catch {
        setGithubStatus({ connected: false })
      }
    }
    checkGithub()

    // Check if just connected via callback redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get("github") === "connected") {
      checkGithub()
      window.history.replaceState({}, "", "/dashboard/settings")
      toast.success("GitHub connected successfully")
    }
  }, [accessToken])

  const handleGithubConnect = async () => {
    try {
      const res = await api.get("/api/github/connect", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      window.location.href = res.data.url
    } catch {
      console.error("Failed to connect GitHub")
    }
  }

  const handleGithubDisconnect = async () => {
    try {
      await api.delete("/api/github/disconnect", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setGithubStatus({ connected: false })
      toast.success("GitHub disconnected")
    } catch {
      toast.error("Failed to disconnect GitHub")
    }
  }

  const handleSetup2FA = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await api.get("/api/auth/2fa/setup", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setQrCode(res.data.qr_code)
      setStep("scanning")
    } catch {
      setError("Failed to setup 2FA. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) { setError("Enter a 6-digit code"); return }
    setLoading(true)
    setError("")
    try {
      await api.post("/api/auth/2fa/confirm",
        { code: totpCode },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      setUser({ ...user!, is_2fa_enabled: true })
      setStep("done")
      setTimeout(() => setStep("idle"), 2500)
      toast.success("Two-factor authentication enabled")
    } catch {
      setError("Invalid code. Please try again.")
      toast.error("Invalid code. Two-factor was not enabled.")
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (totpCode.length !== 6) { setError("Enter your current 6-digit code to disable 2FA"); return }
    setLoading(true)
    setError("")
    try {
      await api.post("/api/auth/2fa/disable",
        { code: totpCode },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      setUser({ ...user!, is_2fa_enabled: false })
      setStep("idle")
      setTotpCode("")
      toast.info("Two-factor authentication disabled")
    } catch {
      setError("Invalid code. 2FA was not disabled.")
      toast.error("Invalid code. Two-factor was not disabled.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setNameSaving(true)
    try {
      await api.patch("/api/auth/me/name",
        { name: nameInput },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      setUser({ ...user!, name: nameInput })
      setEditingName(false)
      toast.success("Display name updated")
    } catch {
      setError("Failed to update name")
      toast.error("Failed to update display name")
    } finally {
      setNameSaving(false)
    }
  }

  const cardClass = "p-6 rounded-2xl border mb-5 bg-[var(--bg-card)] border-[var(--border)] shadow-2xl"
  const titleClass = "text-base font-semibold text-[var(--text-primary)]"
  const subClass = "text-sm text-[var(--text-muted)]"

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl theme-root"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
          Settings
        </h1>
        <p className={subClass}>Manage your account and security preferences</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cardClass}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
            <User size={16} className={isDark ? "text-violet-400" : "text-violet-600"} />
          </div>
          <h2 className={titleClass}>Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
            isDark
              ? "bg-gradient-to-br from-violet-900 to-violet-950 text-violet-300 border border-violet-800/50"
              : "bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 border border-violet-200"
          }`}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                  className={`flex-1 px-3 py-1.5 rounded-xl border text-sm outline-none ${
                    isDark
                      ? "bg-slate-900 border-violet-800 text-white focus:border-violet-600"
                      : "bg-white border-violet-200 text-slate-900 focus:border-violet-400"
                  }`}
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500"
                  }`}
                >
                  {nameSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {user?.name || "User"}
                </p>
                <button
                  onClick={() => { setNameInput(user?.name || ""); setEditingName(true) }}
                  className={`text-xs px-2 py-0.5 rounded-lg border ${
                    isDark
                      ? "border-violet-900/50 text-violet-400 hover:bg-violet-950/30"
                      : "border-violet-200 text-violet-600 hover:bg-violet-50"
                  }`}
                >
                  Edit
                </button>
              </div>
            )}
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {user?.email}
            </p>
          </div>
        </div>
      </motion.div>

      {/* GitHub Connection Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cardClass}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
            <Github size={16} className={isDark ? "text-violet-400" : "text-violet-600"} />
          </div>
          <h2 className={titleClass}>GitHub</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              {githubStatus?.connected
                ? `Connected as @${githubStatus.username}`
                : "Not connected"
              }
            </p>
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {githubStatus?.connected
                ? "ORQESTRA can now analyze repos and create PRs on your behalf"
                : "Connect to enable repo integration and automatic PR creation"
              }
            </p>
          </div>

          {githubStatus?.connected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-green-500" />
                <span className={`text-xs font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                  Connected
                </span>
              </div>
              <button
                onClick={handleGithubDisconnect}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${TRANSITION} ${
                  isDark
                    ? "border-violet-900/40 text-violet-400 hover:bg-violet-950/40"
                    : "border-violet-200 text-violet-600 hover:bg-violet-50"
                }`}
              >
                <XCircle size={12} />
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleGithubConnect}
              className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl border-2 font-semibold ${TRANSITION} ${
                isDark
                  ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  : "border-slate-800 bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Github size={14} />
              Connect GitHub
            </button>
          )}
        </div>
      </motion.div>

      {/* 2FA Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cardClass}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
            <Shield size={16} className={isDark ? "text-violet-400" : "text-violet-600"} />
          </div>
          <h2 className={titleClass}>Two-Factor Authentication</h2>
        </div>

        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Status:{" "}
                    <span className={user?.is_2fa_enabled ? "text-green-500" : isDark ? "text-violet-400" : "text-violet-600"}>
                      {user?.is_2fa_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {user?.is_2fa_enabled
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to add an extra layer of security"}
                  </p>
                </div>
                {!user?.is_2fa_enabled ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSetup2FA}
                    disabled={loading}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${
                      isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500"
                    }`}
                  >
                    {loading ? "Setting up..." : "Enable 2FA"}
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-sm font-medium text-green-500">Active</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setStep("disabling"); setTotpCode(""); setError("") }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
                        isDark
                          ? "border-violet-900/50 text-violet-400 hover:bg-violet-950/40"
                          : "border-violet-200 text-violet-600 hover:bg-violet-50"
                      }`}
                    >
                      <ShieldOff size={14} />
                      Disable
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === "disabling" && (
            <motion.div
              key="disabling"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Enter your current 6-digit authenticator code to disable 2FA
              </p>
              <input
                type="text" maxLength={6} value={totpCode} autoFocus
                onChange={(e) => { setError(""); setTotpCode(e.target.value.replace(/\D/g, "")) }}
                placeholder="000000"
                className={`w-full text-center text-2xl font-mono tracking-widest py-3 rounded-2xl border-2 outline-none ${
                  isDark
                    ? "bg-slate-900/80 border-slate-700 text-white focus:border-violet-600 placeholder:text-slate-700"
                    : "bg-white border-slate-200 text-slate-900 focus:border-violet-400 placeholder:text-slate-300"
                }`}
              />
              {error && <p className="text-violet-400 text-xs text-center">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleDisable2FA}
                  disabled={loading || totpCode.length !== 6}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm ${
                    totpCode.length === 6
                      ? isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500"
                      : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Disabling..." : "Confirm Disable"}
                </button>
                <button
                  onClick={() => { setStep("idle"); setTotpCode(""); setError("") }}
                  className={`px-5 py-3 rounded-xl font-semibold text-sm border ${
                    isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {step === "scanning" && qrCode && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <div className={`p-3 rounded-2xl ${isDark ? "bg-white" : "bg-white border border-violet-100"}`}>
                <img src={`data:image/png;base64,${qrCode}`} alt="2FA QR Code" className="w-44 h-44" />
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  Scan with Google Authenticator
                </p>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Then enter the 6-digit code below to confirm
                </p>
              </div>
              <div className="w-full">
                <input
                  type="text" maxLength={6} value={totpCode}
                  onChange={(e) => { setError(""); setTotpCode(e.target.value.replace(/\D/g, "")) }}
                  placeholder="000000"
                  className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-2xl border-2 outline-none ${
                    isDark
                      ? "bg-slate-900/80 border-slate-700 text-white focus:border-violet-600 placeholder:text-slate-700"
                      : "bg-white border-slate-200 text-slate-900 focus:border-violet-400 placeholder:text-slate-300"
                  } ${error ? "border-violet-500" : ""}`}
                />
                {error && (
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    <AlertCircle size={13} className="text-violet-500" />
                    <p className="text-violet-500 text-xs">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleVerify2FA}
                  disabled={loading || totpCode.length !== 6}
                  className={`w-full mt-3 py-3.5 rounded-2xl font-semibold text-sm ${
                    totpCode.length === 6
                      ? isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500"
                      : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify & Enable 2FA"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle size={28} className="text-green-500" />
              </motion.div>
              <p className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                2FA Enabled Successfully
              </p>
              <p className={`text-sm text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Your account is now protected with two-factor authentication
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* API Keys Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cardClass}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
            <Key size={16} className={isDark ? "text-violet-400" : "text-violet-600"} />
          </div>
          <h2 className={titleClass}>API Keys</h2>
        </div>
        <p className={subClass}>API key management coming soon</p>
      </motion.div>
    </motion.div>
  )
}