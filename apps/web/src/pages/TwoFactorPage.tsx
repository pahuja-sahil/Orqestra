import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Shield } from "lucide-react"
import api from "@/lib/api"

export default function TwoFactorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDark } = useThemeStore()
  const { setAccessToken } = useAuthStore()

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const pendingToken = searchParams.get("token")

  useEffect(() => {
    if (!pendingToken) {
      navigate("/auth/login")
    }
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
      navigate("/dashboard")
    } catch {
      setError("Invalid code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
        isDark ? "bg-[#050008]" : "bg-[#fafafa]"
      }`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.3) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(220,20,60,0.1) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative w-full max-w-md mx-4 p-8 rounded-3xl border ${
          isDark
            ? "border-red-950/40 bg-red-950/10 backdrop-blur-sm"
            : "border-red-100 bg-white/80 backdrop-blur-sm shadow-xl shadow-red-50"
        }`}
      >
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                isDark ? "bg-red-950/60" : "bg-red-50"
              }`}
            >
              <Shield
                size={24}
                className={isDark ? "text-red-500" : "text-red-600"}
              />
            </motion.div>

            <h1
              className={`text-2xl font-bold mb-1 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Two-Factor Auth
            </h1>
            <p
              className={`text-sm text-center ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setError("")
                setCode(e.target.value.replace(/\D/g, ""))
              }}
              placeholder="000000"
              className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-2xl border outline-none transition-all duration-200 ${
                isDark
                  ? "bg-slate-900/80 border-slate-700 text-white focus:border-red-700 placeholder:text-slate-700"
                  : "bg-white border-slate-200 text-slate-900 focus:border-red-400 placeholder:text-slate-300"
              } ${error ? (isDark ? "border-red-700" : "border-red-400") : ""}`}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs text-center mt-2"
              >
                {error}
              </motion.p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
              code.length === 6
                ? isDark
                  ? "bg-red-700 text-white hover:bg-red-600"
                  : "bg-red-600 text-white hover:bg-red-500"
                : isDark
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </motion.button>

          <button
            onClick={() => navigate("/auth/login")}
            className={`w-full text-xs text-center mt-4 transition-colors duration-200 ${
              isDark
                ? "text-slate-600 hover:text-slate-400"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            ← Back to login
          </button>
        </div>
      </motion.div>
    </div>
  )
}