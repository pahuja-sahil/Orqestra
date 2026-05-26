import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Shield, ArrowLeft } from "lucide-react"
import api from "@/lib/api"

export default function TwoFactorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDark } = useThemeStore()
  const { setAccessToken, setUser } = useAuthStore()

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const pendingToken = searchParams.get("token")

  useEffect(() => {
    if (!pendingToken) navigate("/auth/login")
  }, [pendingToken, navigate])

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/api/auth/2fa/verify", {
        pending_token: pendingToken,
        code,
      })
      setAccessToken(res.data.access_token)
      
      const userRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` }
      })
      setUser(userRes.data)
      
      navigate("/dashboard")
    } catch {
      setError("Invalid code. Please try again.")
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 50% 30%, rgba(76,29,149,0.35) 0%, transparent 55%), #09090b"
          : "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.1) 0%, transparent 55%), #fafafa",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative w-full max-w-md mx-4 p-8 rounded-3xl border backdrop-blur-sm ${
          isDark
            ? "border-violet-800/50 bg-zinc-950/90 shadow-2xl shadow-violet-950/40"
            : "border-violet-200/80 bg-white/95 shadow-2xl shadow-violet-100/60"
        }`}
      >
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            background: isDark
              ? "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 60%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.05) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
              isDark
                ? "bg-violet-950/80 border border-violet-800/60"
                : "bg-violet-50 border border-violet-200"
            }`}
          >
            <Shield size={24} className={isDark ? "text-violet-400" : "text-violet-600"} />
          </motion.div>

          <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            Two-Factor Auth
          </h1>
          <p className={`text-sm text-center mb-8 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Enter the 6-digit code from your authenticator app
          </p>

          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setError("")
              setCode(e.target.value.replace(/\D/g, ""))
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="000000"
            autoFocus
            className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-2xl border-2 outline-none mb-3 ${
              isDark
                ? "bg-slate-900/90 border-violet-900/60 text-white focus:border-violet-600 placeholder:text-slate-700"
                : "bg-slate-50 border-violet-200 text-slate-900 focus:border-violet-500 placeholder:text-slate-300"
            } ${error ? (isDark ? "border-violet-500" : "border-violet-500") : ""}`}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-violet-400 text-xs text-center mb-3"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: code.length === 6 ? 1.02 : 1 }}
            whileTap={{ scale: code.length === 6 ? 0.98 : 1 }}
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm mb-4 ${
              code.length === 6
                ? isDark
                  ? "bg-violet-700 text-white hover:bg-violet-600 shadow-lg shadow-violet-950/50"
                  : "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-200/60"
                : isDark
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </motion.button>

          <motion.button
            whileHover={{ x: -3 }}
            onClick={() => navigate("/auth/login")}
            className={`flex items-center gap-2 text-sm font-medium ${
              isDark ? "text-violet-400/80 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"
            }`}
          >
            <ArrowLeft size={14} />
            Back to login
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
