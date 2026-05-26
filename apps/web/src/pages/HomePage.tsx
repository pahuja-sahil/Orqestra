import { motion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { Bot, RefreshCw, Mic, Zap, Shield, Code2, ArrowRight } from "lucide-react"
import { LampContainer } from "@/components/ui/lamp"
import { Navbar } from "@/components/ui/navbar"

const features = [
  { icon: Bot, title: "Multi-Agent AI", description: "Planner, Researcher, CodeGen, and Validator agents working in orchestrated harmony." },
  { icon: RefreshCw, title: "Self-Healing", description: "Detects broken integrations at 2am, fixes them, redeploys — while you sleep." },
  { icon: Mic, title: "Voice Interface", description: "Just speak. ORQESTRA understands, acts, and talks back with results." },
  { icon: Code2, title: "Code Generation", description: "Reads API docs, writes integration code, tests it in a sandbox automatically." },
  { icon: Shield, title: "Guardrails AI", description: "Every agent decision is validated. No hallucinations, no data leaks." },
  { icon: Zap, title: "Real-time Pipeline", description: "Watch your integration being built live with full transparency." },
]

function EdgeGlow({ isDark, side }: { isDark: boolean; side: "left" | "right" }) {
  const particles = Array.from({ length: 10 }, (_, i) => i)

  return (
    <div
      className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-64 pointer-events-none z-10`}
    >
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: isDark
            ? side === "left"
              ? "linear-gradient(to right, rgba(124,58,237,0.35), rgba(109,40,217,0.12), transparent)"
              : "linear-gradient(to left, rgba(124,58,237,0.35), rgba(109,40,217,0.12), transparent)"
            : side === "left"
              ? "linear-gradient(to right, rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)"
              : "linear-gradient(to left, rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)",
        }}
      />

      {particles.map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -(50 + i * 10), 0],
            opacity: [0, 0.6, 0],
            scale: [0.8, 1.6, 0.8],
          }}
          transition={{
            duration: 2.5 + i * 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.7,
          }}
          className="absolute rounded-full"
          style={{
            width: 8 + (i % 4) * 6,
            height: 8 + (i % 4) * 6,
            left: side === "left" ? 8 + (i % 5) * 14 : "auto",
            right: side === "right" ? 8 + (i % 5) * 14 : "auto",
            top: `${5 + i * 9}%`,
            backgroundColor: isDark
              ? `rgba(${110 + i * 5}, 70, 240, 0.85)`
              : `rgba(139,92,246, 0.5)`,
            boxShadow: isDark
              ? `0 0 ${6 + i * 2}px rgba(139,92,246, 0.5)`
              : `0 0 ${5 + i * 1}px rgba(139,92,246, 0.25)`,
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

export default function HomePage() {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
      <Navbar />
      <EdgeGlow isDark={isDark} side="left" />
      <EdgeGlow isDark={isDark} side="right" />

      <LampContainer isDark={isDark}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase ${
              isDark
                ? "border-violet-900/50 bg-violet-950/30 text-violet-400"
                : "border-violet-200 bg-violet-50 text-violet-600"
            }`}
          >
            Autonomous API Integration Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className={`text-6xl md:text-8xl font-bold tracking-tight leading-none ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Meet{" "}
            <span className={`bg-gradient-to-b bg-clip-text text-transparent ${
              isDark
                ? "from-violet-300 via-violet-500 to-violet-900"
                : "from-violet-400 via-violet-600 to-violet-800"
            }`}>
              ORQESTRA
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className={`max-w-xl text-lg leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Your AI conductor that orchestrates any API integration, writes the code, tests it,
            and{" "}
            <span className={isDark ? "text-violet-400 font-medium" : "text-violet-600 font-medium"}>
              fixes itself when it breaks.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex gap-4"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/auth/login")}
              className={`group flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-200 shadow-xl ${
                isDark
                  ? "bg-violet-700 text-white hover:bg-violet-600 shadow-violet-900/40 hover:shadow-violet-700/40"
                  : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-200/60"
              }`}
            >
              Get Started
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className={`px-8 py-3.5 rounded-full border font-semibold transition-all duration-300 ${
                isDark
                  ? "border-violet-900/50 text-slate-300 hover:border-violet-600 hover:text-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  : "border-violet-200 text-slate-700 hover:border-violet-500 hover:text-violet-600 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
              }`}
            >
              View Demo
            </motion.button>
          </motion.div>
        </motion.div>
      </LampContainer>

      <section
        id="features"
        className={`relative py-24 px-6 transition-colors duration-500 ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
              Everything you need,{" "}
              <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                isDark ? "from-violet-400 to-violet-600" : "from-violet-500 to-violet-700"
              }`}>
                nothing you don't
              </span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              A complete AI platform built for developers who ship fast and sleep well.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`group p-6 rounded-2xl border transition-all duration-300 cursor-default ${
                  isDark
                    ? "border-violet-950/40 bg-violet-950/10 hover:border-violet-800/60 hover:bg-violet-950/20 hover:shadow-[0_0_30px_rgba(109,40,217,0.1)]"
                    : "border-violet-100 bg-white hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 ${
                  isDark
                    ? "bg-violet-950/50 group-hover:bg-violet-900/50"
                    : "bg-violet-50 group-hover:bg-violet-100"
                }`}>
                  <Icon size={18} className={isDark ? "text-violet-400" : "text-violet-600"} />
                </div>
                <h3 className={`font-semibold text-base mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {title}
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                  {description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={`relative py-24 px-6 transition-colors duration-500 ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div
            className={`relative p-12 rounded-3xl border overflow-hidden ${
              isDark
                ? "border-violet-800/40 bg-violet-950/25"
                : "border-violet-200 bg-violet-50/80"
            }`}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.35) 0%, transparent 65%)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)",
              }}
            />
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? "radial-gradient(ellipse at 50% 100%, rgba(109,40,217,0.2) 0%, transparent 60%)"
                  : "radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)",
              }}
            />

            <div className="relative z-10">
              <h2 className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
                Ready to never debug an API again?
              </h2>
              <p className={`text-lg mb-8 ${isDark ? "text-violet-300/80" : "text-violet-700/80"}`}>
                Join developers who let ORQESTRA handle the integrations.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/auth/login")}
                className={`group inline-flex items-center gap-2 px-10 py-4 rounded-full font-semibold transition-all duration-200 shadow-xl ${
                  isDark
                    ? "bg-violet-700 text-white hover:bg-violet-600 shadow-violet-900/50 hover:shadow-violet-700/50"
                    : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-300/50"
                }`}
              >
                Start Building Free
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}