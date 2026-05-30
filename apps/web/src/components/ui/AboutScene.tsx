import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"

const LOGS = [
  { delay: 0,    agent: "Plan",    color: "#06b6d4", icon: "◈", text: "Analyzing API specification for Stripe Payments..." },
  { delay: 1400, agent: "Research", color: "#8b5cf6", icon: "⬡", text: "Fetching official docs from stripe.com/docs/api" },
  { delay: 2600, agent: "Research", color: "#8b5cf6", icon: "⬡", text: "Found 14 relevant endpoints. Extracting schemas..." },
  { delay: 3800, agent: "CodeGen",    color: "#6366f1", icon: "◇", text: "Generating TypeScript integration code..." },
  { delay: 4900, agent: "CodeGen",    color: "#6366f1", icon: "◇", text: "Writing stripe-client.ts with full type safety ✓" },
  { delay: 6000, agent: "Validate",  color: "#10b981", icon: "◉", text: "Running sandbox tests... 12/12 passed ✓" },
  { delay: 7100, agent: "Plan",    color: "#06b6d4", icon: "◈", text: "Creating pull request with auto-generated docs..." },
  { delay: 8100, agent: "System",     color: "#f59e0b", icon: "★", text: "PR #247 opened — stripe-integration (ready for review)" },
  { delay: 9200, agent: "Validate",  color: "#10b981", icon: "◉", text: "Monitoring live. Watching for drift or failures..." },
]

type LogEntry = typeof LOGS[number] & { id: number }

export default function AboutOption2({ isDark }: { isDark: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [typing, setTyping] = useState(false)
  const [cursor, setCursor] = useState(true)
  const [cycleKey, setCycleKey] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Blink cursor
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  // Replay logs in a cycle
  useEffect(() => {
    setLogs([])
    const timers: ReturnType<typeof setTimeout>[] = []

    LOGS.forEach((log, i) => {
      const t = setTimeout(() => {
        setTyping(true)
        setTimeout(() => {
          setLogs(prev => [...prev, { ...log, id: cycleKey * 100 + i }])
          setTyping(false)
        }, 380)
      }, log.delay)
      timers.push(t)
    })

    const restart = setTimeout(() => {
      setCycleKey(k => k + 1)
    }, LOGS[LOGS.length - 1].delay + 4500)
    timers.push(restart)

    return () => timers.forEach(clearTimeout)
  }, [cycleKey])

  // Auto-scroll ONLY the terminal div, never the page
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  // Prevent terminal wheel events from bubbling to the page
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => e.stopPropagation()
    el.addEventListener("wheel", handler, { passive: true })
    return () => el.removeEventListener("wheel", handler)
  }, [])

  const termBg    = isDark ? "#080810" : "#f5f4ff"
  const headerBg  = isDark ? "#0f0e1c" : "#eeecff"
  const borderCol = isDark ? "#1e1a3f" : "#c4b5fd"
  const lineNum   = isDark ? "#2e2a4a" : "#b8b0d8"
  const textCol   = isDark ? "#ccc8f0" : "#2e2860"
  const mutedCol  = isDark ? "#4a4570" : "#a09bc0"
  const barCol    = isDark ? "#0f0e1c" : "#eeecff"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: termBg,
        border: `1px solid ${borderCol}`,
        boxShadow: isDark
          ? "0 0 60px rgba(99,66,220,0.12), 0 2px 24px rgba(0,0,0,0.4)"
          : "0 0 40px rgba(139,92,246,0.08), 0 2px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: headerBg, borderColor: borderCol }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-3 text-xs font-mono" style={{ color: mutedCol }}>
            orqestra / agent-runtime
          </span>
        </div>

        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="flex items-center gap-1.5"
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
          <span className="text-xs font-mono" style={{ color: "#4ade80" }}>LIVE</span>
        </motion.div>
      </div>

      {/* ── Agent legend row ── */}
      <div
        className="flex items-center gap-4 px-4 py-2 border-b flex-wrap"
        style={{ background: headerBg, borderColor: borderCol, opacity: 0.85 }}
      >
        {[
          { name: "Planner",    color: "#06b6d4", icon: "◈" },
          { name: "Researcher", color: "#8b5cf6", icon: "⬡" },
          { name: "CodeGen",    color: "#6366f1", icon: "◇" },
          { name: "Validator",  color: "#10b981", icon: "◉" },
          { name: "System",     color: "#f59e0b", icon: "★" },
        ].map(a => (
          <div key={a.name} className="flex items-center gap-1">
            <span className="text-xs" style={{ color: a.color }}>{a.icon}</span>
            <span className="text-xs font-mono" style={{ color: mutedCol }}>{a.name}</span>
          </div>
        ))}
      </div>

      {/* ── Log area — overflow is internal only ── */}
      <div
        ref={scrollRef}
        className="font-mono text-xs p-4 overflow-y-auto"
        style={{
          height: 300,
          // pointer-events on scroll controlled via JS, not CSS
          overscrollBehavior: "contain",
        }}
      >
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-2 mb-2.5 group"
            >
              {/* Line number */}
              <span className="w-4 shrink-0 select-none text-right" style={{ color: lineNum }}>
                {i + 1}
              </span>

              {/* Timestamp */}
              <span className="shrink-0" style={{ color: mutedCol }}>
                {new Date(Date.now() - (LOGS.length - i) * 950).toLocaleTimeString("en-US", { hour12: false })}
              </span>

              {/* Agent icon + badge */}
              <span className="shrink-0 flex items-center gap-1">
                <span style={{ color: log.color }}>{log.icon}</span>
                <span
                  className="px-1.5 py-px rounded text-xs font-semibold"
                  style={{ color: log.color, background: log.color + "18" }}
                >
                  {log.agent}
                </span>
              </span>

              {/* Message — animates letter by letter feel via opacity */}
              <motion.span
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{ color: textCol }}
              >
                {log.text}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing dots */}
        {typing && (
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-4 select-none" style={{ color: lineNum }}>{logs.length + 1}</span>
            <span style={{ color: mutedCol }}>{new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
            <div className="flex gap-1 ml-1 items-center">
              {[0, 1, 2].map(j => (
                <motion.div
                  key={j}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.18 }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#8b5cf6" }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Blinking cursor */}
        {!typing && (
          <div className="flex items-center gap-2">
            <span className="w-4 select-none" style={{ color: lineNum }}>›</span>
            <span style={{ color: isDark ? "#7c6aaa" : "#9585c8" }}>
              {cursor ? "█" : "\u00A0"}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t text-xs font-mono"
        style={{ background: barCol, borderColor: borderCol, color: mutedCol }}
      >
        <span>4 agents running</span>
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ width: `${(logs.length / LOGS.length) * 100}%` }}
            className="h-1 rounded-full"
            style={{ background: "#8b5cf6", minWidth: 4, maxWidth: 80 }}
          />
          <span>{logs.length}/{LOGS.length} ops</span>
        </div>
        <span style={{ color: "#4ade80" }}>● healthy</span>
      </div>
    </motion.div>
  )
}