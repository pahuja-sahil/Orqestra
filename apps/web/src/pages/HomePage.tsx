import { Suspense } from "react"
import { motion } from "motion/react"
import { useNavigate, Link } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { Bot, RefreshCw, Mic, Zap, Shield, Code2, ArrowRight, Loader2 } from "lucide-react"
import { LampContainer } from "@/components/ui/lamp"
import { Navbar } from "@/components/ui/navbar"
import AboutScene from "@/components/ui/AboutScene"

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  { icon: Bot,      title: "Multi-Agent AI",    description: "Planner, Researcher, CodeGen, and Validator agents working in orchestrated harmony." },
  { icon: RefreshCw,title: "Self-Healing",       description: "Detects broken integrations at 2am, fixes them, redeploys — while you sleep." },
  { icon: Mic,      title: "Voice Interface",    description: "Just speak. ORQESTRA understands, acts, and talks back with results." },
  { icon: Code2,    title: "Code Generation",    description: "Reads API docs, writes integration code, tests it in a sandbox automatically." },
  { icon: Shield,   title: "Guardrails AI",      description: "Every agent decision is validated. No hallucinations, no data leaks." },
  { icon: Zap,      title: "Real-time Pipeline", description: "Watch your integration being built live with full transparency." },
]

const steps = [
  { num: "01", color: "border-cyan-500",   textColor: "text-cyan-500",   title: "Converse",     desc: "Describe the API you need in plain English or voice; ORQESTRA understands your intent and plans the integration." },
  { num: "02", color: "border-violet-500", textColor: "text-violet-500", title: "Generate",     desc: "Multi-agent AI researches official docs, writes production-ready code, and validates it in a sandbox." },
  { num: "03", color: "border-indigo-500", textColor: "text-indigo-500", title: "Pull Request", desc: "Creates a detailed PR with code, dependencies, environment setup, and auto-generated documentation." },
  { num: "04", color: "border-amber-500",  textColor: "text-amber-500",  title: "Heal",         desc: "Monitors your integration 24/7; detects failures at 2 AM, fixes them, and redeploys automatically." },
]

// ─── Edge Glow ────────────────────────────────────────────────────────────────
function EdgeGlow({ isDark, side }: { isDark: boolean; side: "left" | "right" }) {
  const particles = Array.from({ length: 10 }, (_, i) => i)
  const isLeft = side === "left"

  return (
    <div className={`fixed top-0 ${isLeft ? "left-0" : "right-0"} h-full w-32 md:w-64 pointer-events-none z-10`}>
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: isDark
            ? isLeft
              ? "linear-gradient(to right, rgba(124,58,237,0.35), rgba(109,40,217,0.12), transparent)"
              : "linear-gradient(to left,  rgba(124,58,237,0.35), rgba(109,40,217,0.12), transparent)"
            : isLeft
              ? "linear-gradient(to right, rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)"
              : "linear-gradient(to left,  rgba(139,92,246,0.15), rgba(139,92,246,0.05), transparent)",
        }}
      />

      {particles.map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -(50 + i * 10), 0], opacity: [0, 0.6, 0], scale: [0.8, 1.6, 0.8] }}
          transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
          className="absolute rounded-full"
          style={{
            width:  8 + (i % 4) * 6,
            height: 8 + (i % 4) * 6,
            left:  isLeft  ? 8 + (i % 5) * 14 : "auto",
            right: !isLeft ? 8 + (i % 5) * 14 : "auto",
            top: `${5 + i * 9}%`,
            backgroundColor: isDark ? `rgba(${110 + i * 5}, 70, 240, 0.85)` : "rgba(139,92,246,0.5)",
            boxShadow: isDark ? `0 0 ${6 + i * 2}px rgba(139,92,246,0.5)` : `0 0 ${5 + i}px rgba(139,92,246,0.25)`,
            filter: "blur(1px)",
          }}
        />
      ))}

      {[{ top: "15%", delay: 0, dur: 4, dy: -40, opacity: [0.35, 0.55, 0.35] },
        { top: "50%", delay: 1.5, dur: 6, dy: 35,  opacity: [0.25, 0.45, 0.25] },
        { top: "75%", delay: 3,   dur: 5, dy: -25, opacity: [0.2,  0.4,  0.2]  }
      ].map(({ top, delay, dur, dy, opacity }, i) => (
        <motion.div
          key={i}
          animate={{ opacity, y: [0, dy, 0] }}
          transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
          className="absolute w-full h-64"
          style={{
            top,
            background: isDark
              ? "radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, transparent 65%)"
              : "radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 65%)",
          }}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()

  const bg   = isDark ? "bg-zinc-950"   : "bg-zinc-50"
  const h1   = isDark ? "text-white"    : "text-slate-900"
  const muted = isDark ? "text-slate-400" : "text-slate-600"
  const badge = isDark
    ? "border-violet-900/50 bg-violet-950/30 text-violet-400"
    : "border-violet-200 bg-violet-50 text-violet-600"
  const gradR = isDark ? "from-violet-400 to-violet-600" : "from-violet-500 to-violet-700"
  const btnPrimary = isDark
    ? "bg-violet-700 text-white hover:bg-violet-600 shadow-violet-900/40 hover:shadow-violet-700/40"
    : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-200/60"
  const btnOutline = isDark
    ? "border-violet-900/50 text-slate-300 hover:border-violet-600 hover:text-violet-400"
    : "border-violet-200 text-slate-700 hover:border-violet-500 hover:text-violet-600"
  const card = isDark
    ? "border-violet-950/40 bg-violet-950/10 hover:border-violet-800/60 hover:bg-violet-950/20"
    : "border-violet-100 bg-white hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50"
  const cardIcon = isDark
    ? "bg-violet-950/50 group-hover:bg-violet-900/50"
    : "bg-violet-50 group-hover:bg-violet-100"

  return (
    <div className={`min-h-screen transition-colors duration-500 ${bg}`}>
      <Navbar />
      <EdgeGlow isDark={isDark} side="left" />
      <EdgeGlow isDark={isDark} side="right" />

      {/* ── Hero / Lamp ──────────────────────────────────────────────────────── */}
      <LampContainer isDark={isDark}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="flex flex-col items-center gap-8 text-center max-w-4xl mx-auto px-4"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase ${badge}`}
          >
            Autonomous API Integration Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none mb-11 ${h1}`}
          >
            Meet{" "}
            <span className={`bg-linear-to-b bg-clip-text text-transparent ${
              isDark ? "from-violet-300 via-violet-500 to-violet-900" : "from-violet-400 via-violet-600 to-violet-800"
            }`}>
              ORQESTRA
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className={`max-w-xl text-base sm:text-lg leading-relaxed ${muted}`}
          >
            Your AI conductor that orchestrates any API integration, writes the code, tests it, and{" "}
            <span className={isDark ? "text-violet-400 font-medium" : "text-violet-600 font-medium"}>
              fixes itself when it breaks.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-4 w-full"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/auth/login")}
              className={`group flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold transition-all duration-200 shadow-xl text-sm sm:text-base ${btnPrimary}`}
            >
              Get Started
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </motion.button>

            {/* View Demo button hidden until demo is ready */}
            {/*
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className={`px-7 py-3.5 rounded-full border font-semibold transition-all duration-300 text-sm sm:text-base ${btnOutline}`}
            >
              View Demo
            </motion.button>
            */}
          </motion.div>
        </motion.div>
      </LampContainer>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className={`relative py-20 md:py-24 px-4 sm:px-6 transition-colors duration-500 ${bg}`}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight ${h1}`}>
              Your API integration pipeline,{" "}
              <span className={`bg-linear-to-r bg-clip-text text-transparent ${gradR}`}>
                orchestrated by AI
              </span>
            </h2>
            <p className={`text-base sm:text-lg max-w-xl mx-auto mt-3 ${muted}`}>
              A complete AI platform built for developers who ship fast and sleep well.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {features.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`group p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-default ${card}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 ${cardIcon}`}>
                  <Icon size={18} className={isDark ? "text-violet-400" : "text-violet-600"} />
                </div>
                <h3 className={`font-semibold text-base mb-2 ${h1}`}>{title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────────────────────── */}
      <section id="about-us" className={`relative py-20 md:py-24 px-4 sm:px-6 transition-colors duration-500 ${bg}`}>
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-10 md:mb-12"
          >
            <span className={`inline-block px-4 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase mb-4 ${badge}`}>
              About ORQESTRA
            </span>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-8 mt-4 ${h1}`}>
              The AI conductor for your{" "}
              <span className={`bg-linear-to-r bg-clip-text text-transparent ${gradR}`}>
                API integrations
              </span>
            </h2>
            <p className={`text-base sm:text-lg max-w-2xl mx-auto mt-4 ${muted}`}>
              ORQESTRA is an autonomous AI that orchestrates the entire integration lifecycle — from understanding
              your requirements to writing production code, creating pull requests, and healing itself when things break.
            </p>
          </motion.div>

          {/* Content row */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Steps */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full lg:w-5/12 space-y-6"
            >
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl border-2 ${step.color} flex items-center justify-center font-bold text-sm ${step.textColor}`}>
                    {step.num}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm ${h1}`}>{step.title}</h3>
                    <p className={`text-sm leading-relaxed mt-0.5 ${muted}`}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/dashboard")}
                className={`group flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg text-sm sm:text-base ${btnPrimary}`}
              >
                See ORQESTRA in action
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            </motion.div>

            {/* 3D Scene */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full lg:w-7/12"
            >
              <div className={`rounded-3xl border overflow-hidden ${
                isDark ? "border-violet-950/40" : "border-violet-200/80"
              }`}>
                <Suspense fallback={
                  <div className={`w-full h-80 sm:h-95 md:h-105 lg:h-120 flex items-center justify-center ${bg}`}>
                    <Loader2 size={24} className={`animate-spin ${isDark ? "text-violet-400" : "text-violet-600"}`} />
                  </div>
                }>
                  <AboutScene isDark={isDark} />
                </Suspense>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className={`relative py-20 md:py-24 px-4 sm:px-6 transition-colors duration-500 ${bg}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div className={`relative p-8 sm:p-12 rounded-3xl border overflow-hidden ${
            isDark ? "border-violet-800/40 bg-violet-950/25" : "border-violet-200 bg-violet-50/80"
          }`}>
            {/* Static glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.35) 0%, transparent 65%)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)",
              }}
            />
            {/* Pulsing glow */}
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
              <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${h1}`}>
                Ready to never debug an API again?
              </h2>
              <p className={`text-base sm:text-lg mb-8 ${isDark ? "text-violet-300/80" : "text-violet-700/80"}`}>
                Join developers who let ORQESTRA handle the integrations.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/auth/login")}
                className={`group inline-flex items-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-semibold transition-all duration-200 shadow-xl text-sm sm:text-base ${btnPrimary}`}
              >
                Start Building Free
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
      {/* ── FOOTER ── */}
      <footer className={`border-t px-4 sm:px-6 py-8 sm:py-10 transition-colors duration-500 ${
        isDark ? "border-violet-950/50 bg-zinc-950" : "border-violet-100 bg-zinc-50"
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDark ? "bg-violet-950/50" : "bg-violet-50"}`}>
              <img src="/webhook.svg" alt="Orqestra Logo" className="w-5 h-5" />
            </div>
            <span className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              ORQESTRA
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            © {new Date().getFullYear()} ORQESTRA. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/privacy"
              className={`text-xs sm:text-sm transition-colors duration-200 ${
                isDark ? "text-slate-600 hover:text-violet-400" : "text-slate-400 hover:text-violet-600"
              }`}
            >
              Privacy
            </Link>
            <Link to="/terms"
              className={`text-xs sm:text-sm transition-colors duration-200 ${
                isDark ? "text-slate-600 hover:text-violet-400" : "text-slate-400 hover:text-violet-600"
              }`}
            >
              Terms
            </Link>
            <span className={`text-xs sm:text-sm ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}>
              Docs
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}