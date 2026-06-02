import { motion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"

function EdgeGlow({ isDark, side }: { isDark: boolean; side: "left" | "right" }) {
  const particles = Array.from({ length: 10 }, (_, i) => i)
  return (
    <div className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-64 pointer-events-none z-10`}>
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: isDark
            ? side === "left"
              ? "linear-gradient(to right, rgba(14, 9, 22, 0.35), rgba(109,40,217,0.12), transparent)"
              : "linear-gradient(to left, rgba(124,58,237,0.35), rgba(109,40,217,0.12), transparent)"
            : side === "left"
              ? "linear-gradient(to right, rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)"
              : "linear-gradient(to left, rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)",
        }}
      />
      {particles.map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -(50 + i * 10), 0], opacity: [0, 0.6, 0], scale: [0.8, 1.6, 0.8] }}
          transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
          className="absolute rounded-full"
          style={{
            width: 8 + (i % 4) * 6,
            height: 8 + (i % 4) * 6,
            left: side === "left" ? 8 + (i % 5) * 14 : "auto",
            right: side === "right" ? 8 + (i % 5) * 14 : "auto",
            top: `${5 + i * 9}%`,
            backgroundColor: isDark ? `rgba(${110 + i * 5}, 70, 240, 0.85)` : `rgba(139,92,246, 0.5)`,
            boxShadow: isDark ? `0 0 ${6 + i * 2}px rgba(139,92,246, 0.5)` : `0 0 ${5 + i * 1}px rgba(139,92,246, 0.25)`,
            filter: "blur(1px)",
          }}
        />
      ))}
      <motion.div
        animate={{ opacity: [0.35, 0.55, 0.35], y: [0, -40, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-full h-80"
        style={{
          top: "15%",
          background: isDark
            ? "radial-gradient(ellipse at center, rgba(139,92,246,0.3) 0%, transparent 65%)"
            : "radial-gradient(ellipse at center, rgba(139,92,246,0.1) 0%, transparent 65%)",
        }}
      />
      <motion.div
        animate={{ opacity: [0.25, 0.45, 0.25], y: [0, 35, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute w-full h-64"
        style={{
          top: "50%",
          background: isDark
            ? "radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, transparent 65%)"
            : "radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 65%)",
        }}
      />
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2], y: [0, -25, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute w-full h-56"
        style={{
          top: "75%",
          background: isDark
            ? "radial-gradient(ellipse at center, rgba(139,92,246,0.25) 0%, transparent 60%)"
            : "radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 60%)",
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()

  const handleGoogleLogin = () => {
    const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${apiBase}/api/auth/google`;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 relative overflow-hidden ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
      <EdgeGlow isDark={isDark} side="left" />
      <EdgeGlow isDark={isDark} side="right" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at 50% 30%, rgba(76,29,149,0.4) 0%, transparent 55%)"
            : "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 55%)",
        }}
      />

      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at 50% 80%, rgba(46,16,101,0.25) 0%, transparent 50%)"
            : "radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.07) 0%, transparent 50%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative z-20 w-full max-w-md mx-4 p-5 sm:p-8 rounded-3xl border backdrop-blur-sm ${
          isDark
            ? "border-violet-800/50 bg-zinc-950/90 shadow-2xl shadow-violet-950/50"
            : "border-violet-200/80 bg-white/90 shadow-2xl shadow-violet-100/80"
        }`}
      >
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            background: isDark
              ? "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.25) 0%, transparent 60%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 60%)",
          }}
        />

        <div
          className={`absolute inset-0 rounded-3xl pointer-events-none ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.08) 0%, transparent 50%, rgba(46,16,101,0.05) 100%)",
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                isDark
                  ? "bg-violet-950/80 border border-violet-900/50"
                  : "bg-violet-50 border border-violet-100"
              }`}
            >
              <img src="/webhook.svg" className="w-7 h-7" alt="Orqestra Logo" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Welcome to ORQESTRA
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`text-sm text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              Sign in to access your AI integration platform
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mb-6 p-4 rounded-2xl border ${
              isDark
                ? "border-violet-900/40 bg-violet-950/30"
                : "border-violet-100 bg-violet-50/60"
            }`}
          >
            <div className="flex flex-col gap-2">
              {["Autonomous API integrations", "Self-healing pipelines", "Voice-powered interface"].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-violet-500" : "bg-violet-600"}`} />
                  <span className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 border ${
              isDark
                ? "border-violet-900/60 bg-violet-950/40 text-white hover:border-violet-700 hover:bg-violet-900/50 hover:shadow-lg hover:shadow-violet-950/50"
                : "border-slate-200 bg-white text-slate-800 hover:border-violet-300 hover:shadow-md hover:shadow-violet-50"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className={`text-xs text-center mt-6 ${isDark ? "text-slate-600" : "text-slate-400"}`}
          >
            By signing in you agree to our{" "}
            <span className={`cursor-pointer ${isDark ? "text-violet-500 hover:text-violet-400" : "text-violet-600 hover:text-violet-500"}`}>
              Terms of Service
            </span>{" "}
            and{" "}
            <span className={`cursor-pointer ${isDark ? "text-violet-500 hover:text-violet-400" : "text-violet-600 hover:text-violet-500"}`}>
              Privacy Policy
            </span>
          </motion.p>

          <motion.div
            className="flex justify-center mt-4"
          >
            <motion.button
              whileHover={{ x: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate("/")}
              className={`flex items-center gap-2 text-base font-semibold transition-colors duration-200 ${
                isDark
                  ? "text-violet-500/80 hover:text-violet-400"
                  : "text-violet-500 hover:text-violet-600"
              }`}
            >
              ← Back to home
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}