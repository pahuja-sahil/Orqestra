import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Shield, User, Key, CheckCircle, AlertCircle, ShieldOff } from "lucide-react"
import api from "@/lib/api"

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
    } catch {
      setError("Invalid code. Please try again.")
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
    } catch {
      setError("Invalid code. 2FA was not disabled.")
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
    } catch {
      setError("Failed to update name")
    } finally {
      setNameSaving(false)
    }
  }

  const cardClass = `p-6 rounded-2xl border mb-5 ${
    isDark ? "border-red-700/50 bg-[#090004]/80 shadow-2xl shadow-red-950/30" : "border-red-200/80 bg-white/90 shadow-2xl shadow-red-100/80"
  }`
  const titleClass = `text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`
  const subClass = `text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl"
    >
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Settings</h1>
        <p className={subClass}>Manage your account and security preferences</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? "bg-red-950/50" : "bg-red-50"}`}>
            <User size={16} className={isDark ? "text-red-400" : "text-red-600"} />
          </div>
          <h2 className={titleClass}>Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
            isDark
              ? "bg-gradient-to-br from-red-900 to-red-950 text-red-300 border border-red-800/50"
              : "bg-gradient-to-br from-red-100 to-red-50 text-red-700 border border-red-200"
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
                      ? "bg-slate-900 border-red-800 text-white focus:border-red-600"
                      : "bg-white border-red-200 text-slate-900 focus:border-red-400"
                  }`}
                />
                <button onClick={handleSaveName} disabled={nameSaving}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isDark ? "bg-red-700 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-500"}`}>
                  {nameSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditingName(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
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
                    isDark ? "border-red-900/50 text-red-400 hover:bg-red-950/30" : "border-red-200 text-red-600 hover:bg-red-50"
                  }`}
                >
                  Edit
                </button>
              </div>
            )}
            <p className={`text-sm mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{user?.email}</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-500" />
              <span className="text-xs text-green-500 font-medium">Verified via Google</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cardClass}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? "bg-red-950/50" : "bg-red-50"}`}>
            <Shield size={16} className={isDark ? "text-red-400" : "text-red-600"} />
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
                    <span className={user?.is_2fa_enabled ? "text-green-500" : isDark ? "text-red-400" : "text-red-600"}>
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
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleSetup2FA} disabled={loading}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${
                      isDark ? "bg-red-700 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-500"
                    }`}>
                    {loading ? "Setting up..." : "Enable 2FA"}
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-sm font-medium text-green-500">Active</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => { setStep("disabling"); setTotpCode(""); setError("") }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
                        isDark
                          ? "border-red-900/50 text-red-400 hover:bg-red-950/40"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}>
                      <ShieldOff size={14} />
                      Disable
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === "disabling" && (
            <motion.div key="disabling" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-4">
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Enter your current 6-digit authenticator code to disable 2FA
              </p>
              <input
                type="text" maxLength={6} value={totpCode} autoFocus
                onChange={(e) => { setError(""); setTotpCode(e.target.value.replace(/\D/g, "")) }}
                placeholder="000000"
                className={`w-full text-center text-2xl font-mono tracking-widest py-3 rounded-2xl border-2 outline-none ${
                  isDark
                    ? "bg-slate-900/80 border-slate-700 text-white focus:border-red-600 placeholder:text-slate-700"
                    : "bg-white border-slate-200 text-slate-900 focus:border-red-400 placeholder:text-slate-300"
                }`}
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleDisable2FA} disabled={loading || totpCode.length !== 6}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm ${
                    totpCode.length === 6
                      ? isDark ? "bg-red-700 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-500"
                      : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}>
                  {loading ? "Disabling..." : "Confirm Disable"}
                </button>
                <button onClick={() => { setStep("idle"); setTotpCode(""); setError("") }}
                  className={`px-5 py-3 rounded-xl font-semibold text-sm border ${
                    isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {step === "scanning" && qrCode && (
            <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5">
              <div className={`p-3 rounded-2xl ${isDark ? "bg-white" : "bg-white border border-red-100"}`}>
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
                      ? "bg-slate-900/80 border-slate-700 text-white focus:border-red-600 placeholder:text-slate-700"
                      : "bg-white border-slate-200 text-slate-900 focus:border-red-400 placeholder:text-slate-300"
                  } ${error ? "border-red-500" : ""}`}
                />
                {error && (
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    <AlertCircle size={13} className="text-red-500" />
                    <p className="text-red-500 text-xs">{error}</p>
                  </div>
                )}
                <button onClick={handleVerify2FA} disabled={loading || totpCode.length !== 6}
                  className={`w-full mt-3 py-3.5 rounded-2xl font-semibold text-sm ${
                    totpCode.length === 6
                      ? isDark ? "bg-red-700 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-500"
                      : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}>
                  {loading ? "Verifying..." : "Verify & Enable 2FA"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
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

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cardClass}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl ${isDark ? "bg-red-950/50" : "bg-red-50"}`}>
            <Key size={16} className={isDark ? "text-red-400" : "text-red-600"} />
          </div>
          <h2 className={titleClass}>API Keys</h2>
        </div>
        <p className={subClass}>API key management coming in Phase 3</p>
      </motion.div>
    </motion.div>
  )
}