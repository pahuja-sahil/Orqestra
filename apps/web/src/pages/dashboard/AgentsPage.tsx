import { motion } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { ArrowRight, CheckCircle, Clock, Zap } from "lucide-react"

const TRANSITION = "transition-all duration-500 ease-in-out"

const PIPELINE = [
  {
    name: "Planner",
    description: "Understands user request, detects API, creates integration plan",
    model: "Groq LLaMA 3.3",
    color: "red",
  },
  {
    name: "Researcher",
    description: "Searches ChromaDB for relevant API documentation",
    model: "Jina Embeddings",
    color: "red",
  },
  {
    name: "Code Generator",
    description: "Writes production-ready integration code based on plan and docs",
    model: "Gemini 2.5 Flash",
    color: "red",
  },
  {
    name: "Evaluator",
    description: "Scores output 1-10, requests retry if below threshold",
    model: "Groq LLaMA 3.3",
    color: "red",
  },
  {
    name: "Guardrails",
    description: "Validates output for safety, dangerous patterns, completeness",
    model: "Custom Validator",
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
      className="max-w-4xl mx-auto w-full"
    >
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${TRANSITION} ${isDark ? "text-white" : "text-slate-900"}`}>
          Agents
        </h1>
        <p className={`text-sm ${TRANSITION} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          ORQESTRA multi-agent pipeline — each agent specializes in one task
        </p>
      </div>

      {/* Pipeline visualization */}
      <div className={`rounded-3xl border p-6 mb-6 ${TRANSITION} ${
        isDark
          ? "border-violet-950/50 bg-[#0a000f]/80 shadow-xl shadow-black/40"
          : "border-violet-200/80 bg-white shadow-xl shadow-violet-100/40"
      }`}>
        <h2 className={`text-sm font-semibold mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          PIPELINE
        </h2>

        <div className="space-y-3">
          {PIPELINE.map((agent, i) => (
            <div key={agent.name}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${TRANSITION} ${
                  isDark
                    ? "bg-white/3 border-white/5 hover:border-violet-900/40"
                    : "bg-violet-50/40 border-violet-100 hover:border-violet-200"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  isDark
                    ? "bg-violet-950/60 text-violet-400 border border-violet-900/40"
                    : "bg-violet-100 text-violet-600 border border-violet-200"
                }`}>
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                      {agent.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${
                      isDark
                        ? "bg-white/5 text-slate-500"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {agent.model}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {agent.description}
                  </p>
                </div>

                <CheckCircle size={16} className={isDark ? "text-violet-800" : "text-violet-300"} />
              </motion.div>

              {i < PIPELINE.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowRight
                    size={14}
                    className={`rotate-90 ${isDark ? "text-violet-900" : "text-violet-300"}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
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
            className={`rounded-2xl border p-4 ${TRANSITION} ${
              isDark
                ? "bg-[#0a000f]/80 border-violet-950/50"
                : "bg-white border-violet-200/80 shadow-sm shadow-violet-100/40"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
              isDark ? "bg-violet-950/60" : "bg-violet-50"
            }`}>
              <Icon size={15} className={isDark ? "text-violet-400" : "text-violet-600"} />
            </div>
            <p className={`text-2xl font-bold mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              {value}
            </p>
            <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {label}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              {sub}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}