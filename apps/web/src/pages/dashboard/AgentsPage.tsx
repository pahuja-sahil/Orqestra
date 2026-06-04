import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { ArrowRight, CheckCircle, Clock, Zap } from "lucide-react"

const PIPELINE = [
  {
    name: "Planner",
    description: "Understands user request, detects API, creates integration plan",
    model: "OpenRouter/Groq LLaMA 3.3 70B",
    color: "red",
  },
  {
    name: "Repo Context",
    description: "Analyzes repo structure, fetches target file content for codegen",
    model: "GitHub API",
    color: "red",
  },
  {
    name: "Researcher",
    description: "Searches ChromaDB for API docs, falls back to web discovery",
    model: "Jina Embeddings + Web",
    color: "red",
  },
  {
    name: "Code Generator",
    description: "Writes integration code with inline guardrails validation",
    model: "Gemini 2.0 Flash / LLaMA 3.3",
    color: "red",
  },
  {
    name: "Evaluator",
    description: "Scores code 1-10, requests retry if below threshold",
    model: "OpenRouter/Groq LLaMA 3.3 70B",
    color: "red",
  },
]

export default function AgentsPage() {
  const { isDark } = useThemeStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto w-full theme-root"
    >
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--text-primary)]">
          Agents
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          ORQESTRA multi-agent pipeline — each agent specializes in one task
        </p>
      </div>

      {/* Pipeline visualization */}
      <div className="rounded-3xl border p-6 mb-6 bg-[var(--bg-card)] border-[var(--border)] shadow-lg">
        <h2 className="text-sm font-semibold mb-5 text-[var(--text-muted)]">
          PIPELINE
        </h2>

        <div className="space-y-3">
          {PIPELINE.map((agent, i) => (
            <div key={agent.name}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border bg-[var(--bg-element)]/40 border-[var(--border)] ${
                  isDark ? "hover:border-violet-900/40" : "hover:border-violet-200"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm bg-[var(--bg-element)] text-[var(--text-accent)] border border-[var(--border)]">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                      {agent.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--bg-element)] text-[var(--text-muted)]">
                      {agent.model}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {agent.description}
                  </p>
                </div>

                <CheckCircle size={16} className="text-[var(--border)]" />
              </motion.div>

              {i < PIPELINE.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowRight
                    size={14}
                    className="rotate-90 text-[var(--border)]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: Zap, label: "Avg Response", value: "~45s", sub: "with Groq fallback" },
          { icon: CheckCircle, label: "Quality Threshold", value: "7/10", sub: "min score to pass" },
          { icon: Clock, label: "Max Retries", value: "3", sub: "before escalation" },
        ].map(({ icon: Icon, label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="rounded-2xl border p-4 bg-[var(--bg-card)] border-[var(--border)] shadow-sm text-center sm:text-left"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 mx-auto sm:mx-0 bg-[var(--bg-element)]">
              <Icon size={15} className="text-[var(--text-accent)]" />
            </div>
            <p className="text-2xl font-bold mb-0.5 text-[var(--text-primary)]">
              {value}
            </p>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {label}
            </p>
            <p className="text-xs mt-0.5 text-[var(--text-muted)] opacity-70">
              {sub}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}