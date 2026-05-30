import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useConverseStore } from "@/store/converseStore"
import {
  Mic, MicOff, Send, RotateCcw, Volume2, MessageSquare,
  GitBranch, Loader2, CheckCircle2, XCircle, ExternalLink, Check, X
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import api from "@/lib/api"

const REPO_PATTERN = /^(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)(?:\/)?$/
const AFFIRMATIVE_PATTERN = /^(?:yes|yeah|sure|ok|okay|go ahead|proceed|yep|y|do it|let's go|please)$/i
const PR_INTENT_PATTERN = /creat(?:e|ing)\s+(?:a\s+)?pr|creat(?:e|ing)\s+pull\s+request|make\s+(?:a\s+)?pr/i

function detectRepoUrl(text: string): string | null {
  const trimmed = text.trim()
  const match = trimmed.match(REPO_PATTERN)
  if (match) {
    const raw = match[0]
    if (raw.startsWith("http")) return raw
    return `https://github.com/${raw.replace(/^https?:\/\/github\.com\//, "")}`
  }
  return null
}

function normalizeRepoUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http")) return trimmed
  return `https://github.com/${trimmed.replace(/^https?:\/\/github\.com\//, "")}`
}

const thinkingMessages = [
  "Processing your request...",
  "Working on it...",
  "Hang tight...",
  "Almost there...",
]

const processingMessages: Record<string, string[]> = {
  transcribing: ["Listening...", "Converting speech...", "Processing voice..."],
  thinking: ["Understanding request...", "Analyzing...", "Preparing response..."],
  synthesizing: ["Generating voice...", "Preparing audio...", "Almost ready..."],
}

function WaveAnimation({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8 + (i % 5) * 0.1, repeat: Infinity, delay: i * 0.05 }}
          className={`w-[3px] rounded-full ${isDark ? "bg-violet-500" : "bg-violet-600"}`}
          style={{ height: `${16 + (i % 7) * 4}px` }}
        />
      ))}
    </div>
  )
}

function ProcessingAnimation({ stage, isDark }: { stage: string; isDark: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const messages = processingMessages[stage] || ["Processing..."]

  useEffect(() => {
    const interval = setInterval(() => setMsgIndex(prev => (prev + 1) % messages.length), 1500)
    return () => clearInterval(interval)
  }, [stage, messages.length])

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative w-14 h-14">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border-2 border-t-transparent ${isDark ? "border-violet-600" : "border-violet-500"}`} />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-2 rounded-full border-2 border-b-transparent ${isDark ? "border-violet-900" : "border-violet-300"}`} />
        <div className={`absolute inset-4 rounded-full ${isDark ? "bg-violet-950/60" : "bg-violet-50"}`} />
      </div>
      <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>{messages[msgIndex]}</p>
    </div>
  )
}

function ThinkingBubble({ isDark }: { isDark: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const msgInterval = setInterval(() => setMsgIndex(prev => (prev + 1) % thinkingMessages.length), 3000)
    const dotInterval = setInterval(() => setDotCount(prev => (prev + 1) % 4), 500)
    return () => { clearInterval(msgInterval); clearInterval(dotInterval) }
  }, [])

  const dots = ".".repeat(dotCount) + " ".repeat(3 - dotCount)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          className={`w-2 h-2 rounded-full ${isDark ? "bg-violet-500" : "bg-violet-600"}`} />
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-violet-400" : "text-violet-600"}`}>ORQESTRA</p>
      </div>
      <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {thinkingMessages[msgIndex]}<span className="font-mono">{dots}</span>
      </p>
    </div>
  )
}

function CodeBlock({ children, className, isDark }: { children: React.ReactNode; className?: string; isDark: boolean }) {
  const isBlock = className?.includes("language-")
  const codeText = String(children).trim()
  const [copied, setCopied] = useState(false)
  return isBlock ? (
    <div className="relative my-2 group">
      <button onClick={() => { navigator.clipboard.writeText(codeText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className={`absolute top-2 right-2 text-xs px-2.5 py-1 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 border border-white/10" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className={`p-4 pt-10 rounded-xl text-sm font-mono tracking-tight overflow-x-auto ${isDark ? "bg-[#0b0614] text-slate-300 border border-white/10" : "bg-slate-50 text-slate-800 border border-slate-200"}`}><code>{children}</code></pre>
    </div>
  ) : (
    <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${isDark ? "bg-white/10 text-violet-300" : "bg-violet-50 text-violet-700"}`}>{children}</code>
  )
}

function OrqestraResponse({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className={`text-base font-bold mb-2 mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{children}</h1>,
        h2: ({ children }) => <h2 className={`text-sm font-bold mb-2 mt-3 ${isDark ? "text-white" : "text-slate-900"}`}>{children}</h2>,
        h3: ({ children }) => <h3 className={`text-sm font-semibold mb-1 mt-2 ${isDark ? "text-violet-400" : "text-violet-600"}`}>{children}</h3>,
        p: ({ children }) => <p className={`mb-2 leading-relaxed text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>{children}</p>,
        strong: ({ children }) => <strong className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{children}</strong>,
        ul: ({ children }) => <ul className="space-y-1.5 mb-3 ml-0 list-none">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1.5 mb-3 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => <li className={`flex items-start gap-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}><span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-violet-500" /><span className="flex-1">{children}</span></li>,
        code: ({ children, className }) => <CodeBlock isDark={isDark} className={className}>{children}</CodeBlock>,
        a: ({ href, children }) => <a href={href ?? ""} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>{children}</a>,
        em: ({ children }) => <em className={`not-italic text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{children}</em>,
      }}>
      {content}
    </ReactMarkdown>
  )
}

function TypewriterText({ content, isDark, isCompleted }: { content: string; isDark: boolean; isCompleted?: boolean }) {
  const [displayedContent, setDisplayedContent] = useState("")
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isCompleted) return
    indexRef.current = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedContent("")

    const CHUNK = 8
    const INTERVAL = 4

    const tick = () => {
      if (indexRef.current >= content.length) return
      const next = Math.min(indexRef.current + CHUNK, content.length)
      setDisplayedContent(content.slice(0, next))
      indexRef.current = next
      timerRef.current = setTimeout(tick, INTERVAL)
    }

    timerRef.current = setTimeout(tick, INTERVAL)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [content, isCompleted])

  return <OrqestraResponse content={isCompleted ? content : displayedContent} isDark={isDark} />
}

function PrConfirmButtons({ isDark, onConfirm, onDeny, loading }: {
  isDark: boolean; onConfirm: () => void; onDeny: () => void; loading: boolean
}) {
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
      <button onClick={onConfirm} disabled={loading}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
          loading
            ? (isDark ? "border-violet-900 text-violet-600" : "border-violet-200 text-violet-400")
            : (isDark ? "border-green-800 text-green-400 hover:bg-green-950/40" : "border-green-300 text-green-600 hover:bg-green-50")
        }`}>
        {loading ? <><Loader2 size={12} className="animate-spin" /> Creating...</> : <><Check size={12} /> Yes, create PR</>}
      </button>
      <button onClick={onDeny} disabled={loading}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
          isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"
        }`}>
        <X size={12} /> Not yet
      </button>
    </div>
  )
}

export default function ConversePage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const { messages, addMessage, updateMessage, removeMessage, markPrDone, setAwaitingPrConfirm, clearMessages } = useConverseStore()
  const [textInput, setTextInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prLoadingId, setPrLoadingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const repoInputRef = useRef<HTMLInputElement>(null)
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [repoStatus, setRepoStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [repoError, setRepoError] = useState("")
  const [repoInfo, setRepoInfo] = useState<{ repoPath: string; defaultBranch: string; language: string } | null>(null)
  const [lastTargetFile, setLastTargetFile] = useState("")

  const {
    voiceState, processingStage, response, error, isSupported, startRecording, stopRecording, reset,
  } = useVoiceRecording(accessToken, (text) => {
    addMessage({ type: "user", content: text, inputMode: "voice" })
  })

  useEffect(() => {
    if (response) addMessage({ type: "orqestra", content: response, inputMode: "voice" })
  }, [response, addMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSubmitting, prLoadingId])

  useEffect(() => {
    const checkGithub = async () => {
      try {
        const res = await api.get("/api/github/status", { headers: { Authorization: `Bearer ${accessToken}` } })
        setGithubConnected(res.data.connected)
      } catch { setGithubConnected(false) }
    }
    checkGithub()
  }, [accessToken])

  const extractCodeFromMarkdown = (content: string): string | null => {
    const match = content.match(/```(?:\w+)?\n([\s\S]*?)```/)
    return match ? match[1].trim() : null
  }

  const findLastCodeMessage = useCallback((): { id: string; content: string; apiName?: string } | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.type === "orqestra" && m.content.includes("```") && !m.isPrResult) {
        return { id: m.id, content: m.content, apiName: m.apiName }
      }
    }
    return null
  }, [messages])

  const executeCreatePR = useCallback(async (msgId: string, content: string, apiName?: string) => {
    if (!repoUrl || !repoInfo || prLoadingId) return
    setPrLoadingId(msgId)
    try {
      const repoPath = repoInfo.repoPath || repoUrl.replace("https://github.com/", "")
      const targetFile = lastTargetFile || "integrations.py"
      addMessage({ type: "orqestra", content: `⏳ Creating PR in \`${targetFile}\`...`, inputMode: "text" })
      const rawCode = extractCodeFromMarkdown(content)
      if (!rawCode) { setPrLoadingId(null); return }
      const prRes = await api.post("/api/github/create-pr", {
        repo_path: repoPath,
        api_name: repoPath.split("/")[1] || "repo",
        real_api_name: apiName || repoPath.split("/")[1] || "repo",
        target_file: targetFile,
        generated_code: rawCode,
        default_branch: repoInfo.defaultBranch,
        repo_url: repoUrl,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })
      markPrDone(msgId)
      setAwaitingPrConfirm(msgId, false)
      addMessage({ type: "orqestra", content: `✅ PR created successfully! [View PR on GitHub](${prRes.data.pr_url})`, inputMode: "text", isPrResult: true })
      toast.success(`Pull request created for ${apiName || repoPath.split("/")[1] || "repo"}`)
    } catch (err: unknown) {
      markPrDone(msgId)
      setAwaitingPrConfirm(msgId, false)
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to create PR"
      addMessage({ type: "orqestra", content: `❌ Failed to create PR: ${errorMsg}`, inputMode: "text", isPrResult: true })
      toast.error("Failed to create pull request")
    } finally { setPrLoadingId(null) }
  }, [repoUrl, repoInfo, lastTargetFile, prLoadingId, accessToken, addMessage, markPrDone, setAwaitingPrConfirm])

  const checkResponseForPrAsk = useCallback((responseText: string, msgId: string) => {
    const prKeywords = /ready for PR|create.*PR|pull request|shall i|should i|do you want|are you ready/i
    if (prKeywords.test(responseText) && responseText.includes("```")) {
      setAwaitingPrConfirm(msgId, true)
    }
  }, [setAwaitingPrConfirm])

  const handleTextSubmit = useCallback(async (overrideText?: string) => {
    const userText = overrideText || textInput
    if (!userText.trim() || isSubmitting) return
    setTextInput("")
    addMessage({ type: "user", content: userText, inputMode: "text" })
    setIsSubmitting(true)

    const placeholderId = addMessage({ type: "orqestra", content: "", inputMode: "text", isPlaceholder: true })

    try {
      const detectedRepoUrl = detectRepoUrl(userText)
      const isAffirmative = AFFIRMATIVE_PATTERN.test(userText.trim())
      const wantsPr = PR_INTENT_PATTERN.test(userText.trim()) || isAffirmative

      if (wantsPr) {
        const lastCode = findLastCodeMessage()
        if (lastCode) {
          removeMessage(placeholderId)
          setIsSubmitting(false)
          await executeCreatePR(lastCode.id, lastCode.content, lastCode.apiName)
          return
        }
      }

      const history = messages.slice(-8).map(m => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }))

      if (detectedRepoUrl && !repoUrl) {
        setRepoUrl(detectedRepoUrl)
        setRepoStatus("validating")
        updateMessage(placeholderId, { content: `🔗 Detected repository URL: **${detectedRepoUrl}**`, isPlaceholder: false })
        try {
          const analyzeRes = await api.post("/api/github/analyze", { repo_url: detectedRepoUrl }, { headers: { Authorization: `Bearer ${accessToken}` } })
          setRepoStatus("valid")
          setRepoInfo({
            repoPath: analyzeRes.data.repo_path,
            defaultBranch: analyzeRes.data.default_branch,
            language: analyzeRes.data.language,
          })
          updateMessage(placeholderId, { content: `✅ Repository connected: **${analyzeRes.data.repo_path}** (${analyzeRes.data.language})`, isPlaceholder: false })
          const lastUserMsg = [...messages].reverse().find(m => m.type === "user" && m.inputMode === "text")
          const intentText = lastUserMsg ? lastUserMsg.content : `Proceed with integration in ${detectedRepoUrl}`
          updateMessage(placeholderId, { content: "", isPlaceholder: true })
          const res = await api.post("/api/converse/process", {
            text: intentText,
            repo_url: detectedRepoUrl,
            conversation_history: history,
          }, { headers: { Authorization: `Bearer ${accessToken}` } })
          updateMessage(placeholderId, { content: res.data.response, isPlaceholder: false, apiName: res.data.api_name || "" })
          setLastTargetFile(res.data.target_file || "")
          checkResponseForPrAsk(res.data.response, placeholderId)
        } catch {
          setRepoStatus("invalid")
          setRepoUrl("")
          setRepoInfo(null)
          updateMessage(placeholderId, { content: "❌ Could not access repository. Check the URL and ensure GitHub is connected in Settings.", isPlaceholder: false })
        }
      } else {
        const res = await api.post("/api/converse/process", {
          text: userText,
          repo_url: repoUrl,
          conversation_history: history,
        }, { headers: { Authorization: `Bearer ${accessToken}` } })
        updateMessage(placeholderId, { content: res.data.response, isPlaceholder: false, apiName: res.data.api_name || "" })
        if (res.data.target_file) setLastTargetFile(res.data.target_file)
        checkResponseForPrAsk(res.data.response, placeholderId)
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      const errorMsg = e?.response?.data?.detail || e?.message || ""
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        updateMessage(placeholderId, { content: "ORQESTRA is thinking hard right now — rate limit reached. Please retry in a moment.", isPlaceholder: false })
      } else if (errorMsg.includes("blocked") || errorMsg.includes("safety")) {
        updateMessage(placeholderId, { content: "That request was blocked by safety guardrails. Please rephrase your request.", isPlaceholder: false })
      } else {
        updateMessage(placeholderId, { content: "Something went wrong. Please try again.", isPlaceholder: false })
      }
    } finally { setIsSubmitting(false) }
  }, [textInput, repoUrl, accessToken, isSubmitting, addMessage, updateMessage, removeMessage, executeCreatePR, checkResponseForPrAsk, messages, findLastCodeMessage])

  const handleMicClick = () => {
    if (voiceState === "idle") startRecording()
    else if (voiceState === "recording") stopRecording()
  }

  const handleClear = useCallback(() => {
    reset(); setTextInput(""); setPrLoadingId(null); clearMessages()
  }, [reset, clearMessages])

  const handleRepoSubmit = async () => {
    const trimmed = repoUrl.trim()
    if (!trimmed) return
    const normalized = normalizeRepoUrl(trimmed)
    setRepoStatus("validating")
    setRepoError("")
    const placeholderId = addMessage({ type: "orqestra", content: `🔗 Validating repository: ${normalized}`, inputMode: "text" })
    try {
      const res = await api.post("/api/github/analyze", { repo_url: normalized }, { headers: { Authorization: `Bearer ${accessToken}` } })
      setRepoStatus("valid")
      setRepoInfo({
        repoPath: res.data.repo_path,
        defaultBranch: res.data.default_branch,
        language: res.data.language,
      })
      updateMessage(placeholderId, { content: `✅ Repository connected: **${res.data.repo_path}** (${res.data.language})` })
      const lastUserMsg = [...messages].reverse().find(m => m.type === "user" && m.inputMode === "text")
      const intentText = lastUserMsg ? lastUserMsg.content : `Proceed with integration in ${normalized}`
      const history = messages.slice(-8).map(m => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }))
      updateMessage(placeholderId, { content: "", isPlaceholder: true })
      const converseRes = await api.post("/api/converse/process", {
        text: intentText,
        repo_url: normalized,
        conversation_history: history,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })
      updateMessage(placeholderId, { content: converseRes.data.response, isPlaceholder: false, apiName: converseRes.data.api_name || "" })
      setLastTargetFile(converseRes.data.target_file || "")
      checkResponseForPrAsk(converseRes.data.response, placeholderId)
    } catch {
      setRepoStatus("invalid")
      setRepoError("Could not access repository. Check the URL and ensure GitHub is connected.")
      setRepoInfo(null)
      updateMessage(placeholderId, { content: "❌ Could not access repository. Check the URL and ensure GitHub is connected in Settings." })
    }
  }

  const isRecording = voiceState === "recording"
  const isProcessing = voiceState === "processing"
  const isResponding = voiceState === "responding"
  const cardBorder = "border-[var(--border)]"
  const cardBg = "bg-[var(--bg-card)]"

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-[calc(100vh-7rem)] flex flex-col theme-root">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Converse</h1>
        <p className="text-xs text-[var(--text-muted)]">Talk to ORQESTRA — speak or type</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        {/* ─── LEFT PANEL: Input (40%) ─── */}
        <div className="w-full lg:w-2/5 flex flex-col gap-5 overflow-y-auto pr-1 min-w-0">
          {/* GitHub Status + Repo URL */}
          <div className={`rounded-2xl border p-5 ${cardBg} ${cardBorder}`}>
            {githubConnected === null ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-500" />
                <span className="text-xs text-slate-500">Checking GitHub...</span>
              </div>
            ) : githubConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>GitHub connected</span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={repoInputRef}
                    value={repoUrl}
                    onChange={(e) => { setRepoUrl(e.target.value); setRepoStatus("idle"); setRepoError("") }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRepoSubmit() }}
                    placeholder="owner/repo or full GitHub URL"
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs outline-none border transition-all ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-700" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"} ${repoStatus === "invalid" ? (isDark ? "border-red-500" : "border-red-500") : ""}`} />
                  <button onClick={handleRepoSubmit} disabled={repoStatus === "validating" || !repoUrl.trim()}
                    className={`p-2.5 rounded-xl text-white transition-all ${repoStatus === "validating" ? "bg-violet-700/50 cursor-not-allowed" : "bg-violet-700 hover:bg-violet-600"}`}>
                    {repoStatus === "validating" ? <Loader2 size={15} className="animate-spin" /> : <GitBranch size={15} />}
                  </button>
                </div>
                {repoStatus === "valid" && <p className={`text-xs flex items-center gap-1 ${isDark ? "text-green-500" : "text-green-600"}`}><CheckCircle2 size={12} /> Repo connected</p>}
                {repoError && <p className="text-xs text-red-500">{repoError}</p>}
                {repoUrl && repoStatus === "valid" && (
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>{repoUrl.replace("https://github.com/", "")}</span>
                    <ExternalLink size={10} className={isDark ? "text-slate-600" : "text-slate-400"} />
                  </div>
                )}
                <p className={`text-[10px] leading-relaxed ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                  You can also type the repo URL directly in chat. I'll auto-detect it.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle size={15} className="text-slate-500" />
                  <span className="text-xs text-slate-500">GitHub not connected</span>
                </div>
                <a href="/dashboard/settings" className="text-xs font-semibold px-3 py-1.5 rounded-xl border text-violet-500 border-violet-800 hover:bg-violet-950/40 transition-all">Connect →</a>
              </div>
            )}
          </div>

          {/* Voice Recording */}
          <div className={`rounded-2xl border p-6 flex flex-col items-center gap-4 ${cardBg} ${cardBorder}`}>
            <AnimatePresence mode="wait">
              {voiceState === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-3">
                  <motion.div animate={{ boxShadow: [`0 0 0 0 ${isDark ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.25)"}`, `0 0 0 18px rgba(139,92,246,0)`] }} transition={{ duration: 2, repeat: Infinity }} className="rounded-full">
                    <button onClick={handleMicClick} disabled={!isSupported}
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${isDark ? "border-violet-800 bg-violet-950/60 text-violet-400 hover:bg-violet-900/60" : "border-violet-400 bg-violet-50 text-violet-600 hover:bg-violet-100"}`}>
                      <Mic size={24} /></button>
                  </motion.div>
                  <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-violet-500"}`}>{isSupported ? "Tap to speak" : "Not supported"}</p>
                </motion.div>
              )}
              {isRecording && (
                <motion.div key="recording" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-3 w-full">
                  <WaveAnimation isDark={isDark} />
                  <button onClick={handleMicClick}
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-violet-500 bg-violet-700/60 text-white transition-all">
                    <MicOff size={20} /></button>
                  <p className={`text-xs font-medium ${isDark ? "text-violet-400" : "text-violet-600"}`}>Recording — tap to stop</p>
                </motion.div>
              )}
              {isProcessing && processingStage && (
                <motion.div key="processing" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
                  <ProcessingAnimation stage={processingStage} isDark={isDark} />
                </motion.div>
              )}
              {isResponding && (
                <motion.div key="responding" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-2">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${isDark ? "border-violet-800 bg-violet-950/60" : "border-violet-300 bg-violet-50"}`}>
                    <Volume2 size={22} className={isDark ? "text-violet-400" : "text-violet-600"} /></motion.div>
                  <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-violet-600"}`}>ORQESTRA responding...</p>
                </motion.div>
              )}
            </AnimatePresence>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>

          {/* Text Input */}
          <div className={`rounded-2xl border p-4 ${cardBg} ${cardBorder}`}>
            <div className="flex items-end gap-2">
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit() } }}
                placeholder="Ask to integrate an API, or paste a repo URL..." rows={3}
                className={`flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none border transition-all ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-700" : "bg-violet-50/40 border-violet-200 text-slate-900 placeholder:text-violet-300 focus:border-violet-400"}`} />
              <button onClick={() => handleTextSubmit()} disabled={!textInput.trim() || isSubmitting}
                className={`p-3 rounded-xl flex-shrink-0 transition-all ${!textInput.trim() || isSubmitting ? (isDark ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400") : (isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500")}`}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Chat (60%) ─── */}
        <div className={`flex-1 rounded-2xl border flex flex-col min-h-[40vh] lg:min-h-0 overflow-x-hidden ${cardBg} ${cardBorder}`}>
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageSquare size={32} className={`mx-auto mb-3 ${isDark ? "text-violet-900" : "text-violet-200"}`} />
                  <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Start a conversation</p>
                  <p className={`text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>Ask ORQESTRA to integrate an API in your project</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl ${msg.type === "user"
                      ? (isDark ? "bg-white/5 border border-white/10" : "bg-violet-50 border border-violet-200")
                      : (isDark ? "bg-violet-950/30 border border-violet-900/40" : "bg-gradient-to-br from-violet-50 to-white border border-violet-200")}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {msg.type === "user" ? (
                        <><MessageSquare size={11} className={isDark ? "text-slate-500" : "text-violet-400"} />
                          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-violet-400"}`}>
                            {msg.inputMode === "voice" ? "You (voice)" : "You"}</p></>
                      ) : (
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-violet-400" : "text-violet-600"}`}>ORQESTRA</p>
                      )}
                    </div>
                    {msg.type === "user" ? (
                      <p className={`text-sm leading-relaxed break-words ${isDark ? "text-slate-200" : "text-slate-800"}`}>{msg.content}</p>
                    ) : msg.isPlaceholder ? (
                      <ThinkingBubble isDark={isDark} />
                    ) : (
                      <>
                        <div className="break-words min-w-0"><TypewriterText content={msg.content} isDark={isDark} isCompleted={msg.isCompleted} /></div>
                        {msg.awaitingPrConfirm && !msg.isPrResult && (
                          <PrConfirmButtons
                            isDark={isDark}
                            onConfirm={() => executeCreatePR(msg.id, msg.content, msg.apiName)}
                            onDeny={() => {
                              setAwaitingPrConfirm(msg.id, false)
                              markPrDone(msg.id)
                            }}
                            loading={prLoadingId === msg.id}
                          />
                        )}
                        {githubConnected && repoUrl && !msg.awaitingPrConfirm && !msg.isPrResult && msg.content.includes("```") && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <button onClick={() => executeCreatePR(msg.id, msg.content, msg.apiName)} disabled={prLoadingId === msg.id}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${prLoadingId === msg.id
                                ? (isDark ? "border-violet-900 text-violet-600" : "border-violet-200 text-violet-400")
                                : (isDark ? "border-violet-800 text-violet-400 hover:bg-violet-950/40" : "border-violet-300 text-violet-600 hover:bg-violet-50")}`}>
                              {prLoadingId === msg.id ? <><Loader2 size={12} className="animate-spin" /> Creating PR...</> : <><GitBranch size={12} /> Create PR in repo</>}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
                <div className="flex justify-end pt-2">
                  <button onClick={handleClear} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-all ${isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                    <RotateCcw size={11} /> Clear chat
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
