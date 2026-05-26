import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useConverseStore } from "@/store/converseStore"
import { Mic, MicOff, Send, RotateCcw, Volume2, MessageSquare, GitBranch, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"
import api from "@/lib/api"

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
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-")
          const codeText = String(children).trim()
          const [copied, setCopied] = useState(false)
          return isBlock ? (
            <div className="relative my-2">
              <button onClick={() => { navigator.clipboard.writeText(codeText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className={`absolute top-2 right-2 text-xs px-2.5 py-1 rounded-lg font-medium ${isDark ? "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 border border-white/10" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre className={`p-4 pt-10 rounded-xl text-sm font-mono tracking-tight overflow-x-auto ${isDark ? "bg-[#0b0614] text-slate-300 border border-white/10" : "bg-slate-50 text-slate-800 border border-slate-200"}`}><code>{children}</code></pre>
            </div>
          ) : (
            <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${isDark ? "bg-white/10 text-violet-300" : "bg-violet-50 text-violet-700"}`}>{children}</code>
          )
        },
        a: ({ href, children }) => <a href={href ?? ""} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>{children}</a>,
        em: ({ children }) => <em className={`not-italic text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{children}</em>,
      }}>
      {content}
    </ReactMarkdown>
  )
}

function TypewriterText({ content, isDark, isCompleted }: { content: string; isDark: boolean; isCompleted?: boolean }) {
  const [displayedContent, setDisplayedContent] = useState("")
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (isCompleted) {
      setDisplayedContent(content)
      setIndex(content.length)
      return
    }
    if (index < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(prev => prev + content[index])
        setIndex(prev => prev + 1)
      }, 3)
      return () => clearTimeout(timeout)
    }
  }, [index, content, isCompleted])

  if (isCompleted) return <OrqestraResponse content={content} isDark={isDark} />
  return <OrqestraResponse content={displayedContent} isDark={isDark} />
}

function validateRepoUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return "Repository URL is required"
  const patterns = [
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/)?$/,
    /^[\w.-]+\/[\w.-]+$/,
  ]
  if (!patterns.some(p => p.test(trimmed))) {
    return "Invalid repo URL. Use format: github.com/owner/repo or owner/repo"
  }
  return null
}

function normalizeRepoUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http")) return trimmed
  return `https://github.com/${trimmed.replace(/^https?:\/\/github\.com\//, "")}`
}

export default function ConversePage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const { messages, addMessage, markPrDone, clearMessages } = useConverseStore()
  const [textInput, setTextInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prLoadingId, setPrLoadingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [repoStatus, setRepoStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [repoError, setRepoError] = useState("")

  const {
    voiceState, processingStage, response, error, isSupported, startRecording, stopRecording, reset,
  } = useVoiceRecording(accessToken, (text) => {
    addMessage({ type: "user", content: text, inputMode: "voice" })
  })

  useEffect(() => {
    if (response) addMessage({ type: "orqestra", content: response, inputMode: "voice" })
  }, [response])

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

  const handleTextSubmit = useCallback(async (overrideText?: string) => {
    const userText = overrideText || textInput
    if (!userText.trim() || isSubmitting) return
    setTextInput("")
    addMessage({ type: "user", content: userText, inputMode: "text" })
    setIsSubmitting(true)
    try {
      const res = await api.post("/api/converse/process", { text: userText, repo_url: repoUrl }, { headers: { Authorization: `Bearer ${accessToken}` } })
      addMessage({ type: "orqestra", content: res.data.response, inputMode: "text", apiName: res.data.api_name || "" })
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || ""
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        addMessage({ type: "orqestra", content: "ORQESTRA is thinking hard right now — rate limit reached. Please retry in a moment.", inputMode: "text" })
      } else if (errorMsg.includes("blocked") || errorMsg.includes("safety")) {
        addMessage({ type: "orqestra", content: "That request was blocked by safety guardrails. Please rephrase your request.", inputMode: "text" })
      } else {
        addMessage({ type: "orqestra", content: "Something went wrong. Please try again.", inputMode: "text" })
      }
    } finally { setIsSubmitting(false) }
  }, [textInput, repoUrl, accessToken, isSubmitting, addMessage])

  const handleMicClick = () => {
    if (voiceState === "idle") startRecording()
    else if (voiceState === "recording") stopRecording()
  }

  const handleClear = useCallback(() => {
    reset(); setTextInput(""); setPrLoadingId(null); clearMessages()
  }, [reset, clearMessages])

  const extractCodeFromMarkdown = (content: string): string | null => {
    const match = content.match(/```(?:\w+)?\n([\s\S]*?)```/)
    return match ? match[1].trim() : null
  }

  const handleCreatePR = useCallback(async (msg: { id: string; content: string; apiName?: string; isPrResult?: boolean }) => {
    if (!repoUrl || prLoadingId || msg.isPrResult) return
    setPrLoadingId(msg.id)
    try {
      addMessage({ type: "orqestra", content: "⏳ Analyzing repository and preparing PR...", inputMode: "text" })
      const analyzeRes = await api.post("/api/github/analyze", { repo_url: repoUrl }, { headers: { Authorization: `Bearer ${accessToken}` } })
      const repoData = analyzeRes.data
      const rawCode = extractCodeFromMarkdown(msg.content)
      if (!rawCode) { setPrLoadingId(null); return }
      addMessage({ type: "orqestra", content: "⏳ Creating pull request...", inputMode: "text" })
      const prRes = await api.post("/api/github/create-pr", {
        repo_path: repoData.repo_path, api_name: repoData.repo_name,
        real_api_name: msg.apiName || repoData.repo_name, target_file: repoData.best_file,
        generated_code: rawCode, default_branch: repoData.default_branch, repo_url: repoUrl,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })
      markPrDone(msg.id)
      addMessage({ type: "orqestra", content: `✅ PR created successfully! [View PR on GitHub](${prRes.data.pr_url})`, inputMode: "text", isPrResult: true })
    } catch (err: any) {
      markPrDone(msg.id)
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to create PR"
      addMessage({ type: "orqestra", content: `❌ Failed to create PR: ${errorMsg}`, inputMode: "text", isPrResult: true })
    } finally { setPrLoadingId(null) }
  }, [repoUrl, prLoadingId, accessToken, addMessage, markPrDone])

  const handleRepoSubmit = async () => {
    const validationError = validateRepoUrl(repoUrl)
    if (validationError) {
      setRepoError(validationError)
      setRepoStatus("invalid")
      return
    }
    setRepoStatus("validating")
    setRepoError("")
    addMessage({ type: "orqestra", content: `🔗 Setting repository: ${normalizeRepoUrl(repoUrl)}`, inputMode: "text" })
    try {
      const res = await api.post("/api/github/analyze", { repo_url: normalizeRepoUrl(repoUrl) }, { headers: { Authorization: `Bearer ${accessToken}` } })
      setRepoStatus("valid")
      addMessage({ type: "orqestra", content: `✅ Repository connected: **${res.data.repo_path}** (${res.data.language})`, inputMode: "text" })
    } catch {
      setRepoStatus("invalid")
      setRepoError("Could not access repository. Check the URL and ensure GitHub is connected.")
      addMessage({ type: "orqestra", content: `❌ Could not access repository. Check the URL and ensure GitHub is connected in Settings.`, inputMode: "text" })
    }
  }

  const isRecording = voiceState === "recording"
  const isProcessing = voiceState === "processing"
  const isResponding = voiceState === "responding"
  const cardBorder = isDark ? "border-violet-950/50" : "border-violet-200/80"
  const cardBg = isDark ? "bg-[#0a000f]/80" : "bg-white/80"

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Converse</h1>
        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>Talk to ORQESTRA — speak or type</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* ─── LEFT PANEL: Input ─── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* GitHub Status + Repo URL */}
          <div className={`rounded-2xl border p-4 ${cardBg} ${cardBorder}`}>
            {githubConnected === null ? (
              <div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-violet-500" /><span className="text-xs text-slate-500">Checking GitHub...</span></div>
            ) : githubConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>GitHub connected</span>
                </div>
                <div className="flex gap-2">
                  <input value={repoUrl} onChange={(e) => { setRepoUrl(e.target.value); setRepoStatus("idle"); setRepoError("") }}
                    placeholder="owner/repo or full URL"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs outline-none border ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"} ${repoStatus === "invalid" ? (isDark ? "border-red-500" : "border-red-500") : ""}`} />
                  <button onClick={handleRepoSubmit} disabled={repoStatus === "validating" || !repoUrl.trim()}
                    className={`p-2 rounded-xl text-white ${repoStatus === "validating" ? "bg-violet-700/50 cursor-not-allowed" : "bg-violet-700 hover:bg-violet-600"}`}>
                    {repoStatus === "validating" ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
                  </button>
                </div>
                {repoStatus === "valid" && <p className={`text-xs ${isDark ? "text-green-500" : "text-green-600"}`}>✓ Repo connected</p>}
                {repoError && <p className="text-xs text-red-500">{repoError}</p>}
                {repoUrl && repoStatus !== "invalid" && repoStatus !== "validating" && (
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>{repoUrl.replace("https://github.com/", "")}</span>
                    <ExternalLink size={10} className={isDark ? "text-slate-600" : "text-slate-400"} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-500">GitHub not connected</span>
                </div>
                <a href="/dashboard/settings" className="text-xs font-semibold px-3 py-1.5 rounded-xl border text-violet-500 border-violet-800 hover:bg-violet-950/40">Connect →</a>
              </div>
            )}
          </div>

          {/* Voice Recording */}
          <div className={`rounded-2xl border p-5 flex flex-col items-center gap-3 ${cardBg} ${cardBorder}`}>
            <AnimatePresence mode="wait">
              {voiceState === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-2">
                  <motion.div animate={{ boxShadow: [`0 0 0 0 ${isDark ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.25)"}`, `0 0 0 18px rgba(139,92,246,0)`] }} transition={{ duration: 2, repeat: Infinity }} className="rounded-full">
                    <button onClick={handleMicClick} disabled={!isSupported}
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${isDark ? "border-violet-800 bg-violet-950/60 text-violet-400" : "border-violet-400 bg-violet-50 text-violet-600"}`}>
                      <Mic size={24} /></button>
                  </motion.div>
                  <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-violet-500"}`}>{isSupported ? "Tap to speak" : "Not supported"}</p>
                </motion.div>
              )}
              {isRecording && (
                <motion.div key="recording" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-3 w-full">
                  <WaveAnimation isDark={isDark} />
                  <button onClick={handleMicClick}
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-violet-500 bg-violet-700/60 text-white">
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
          <div className={`rounded-2xl border p-3 ${cardBg} ${cardBorder}`}>
            <div className="flex items-end gap-2">
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit() } }}
                placeholder="Type a command..." rows={2}
                className={`flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none border ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-800" : "bg-violet-50/40 border-violet-200 text-slate-900 placeholder:text-violet-300 focus:border-violet-400"}`} />
              <button onClick={() => handleTextSubmit()} disabled={!textInput.trim() || isSubmitting}
                className={`p-3 rounded-xl flex-shrink-0 ${!textInput.trim() || isSubmitting ? (isDark ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400") : (isDark ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-violet-600 text-white hover:bg-violet-500")}`}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Chat ─── */}
        <div className={`flex-1 rounded-2xl border flex flex-col ${cardBg} ${cardBorder}`}>
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageSquare size={32} className={`mx-auto mb-3 ${isDark ? "text-violet-900" : "text-violet-200"}`} />
                  <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Start a conversation</p>
                  <p className={`text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>Speak or type to ask ORQESTRA to integrate an API</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <p className={`text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{msg.content}</p>
                    ) : (
                      <>
                        <TypewriterText content={msg.content} isDark={isDark} isCompleted={msg.isCompleted} />
                        {githubConnected && repoUrl && !msg.isPrResult && msg.content.includes("```") && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <button onClick={() => handleCreatePR(msg)} disabled={prLoadingId === msg.id}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${prLoadingId === msg.id
                                ? (isDark ? "border-violet-900 text-violet-600" : "border-violet-200 text-violet-400")
                                : (isDark ? "border-violet-800 text-violet-400 hover:bg-violet-950/40" : "border-violet-300 text-violet-600 hover:bg-violet-50")}`}>
                              {prLoadingId === msg.id ? <><Loader2 size={12} className="animate-spin" /> Creating PR...</> : "Create PR in repo"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
                <div className="flex justify-end pt-2">
                  <button onClick={handleClear} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${isDark ? "text-slate-600 hover:text-slate-400 hover:bg-white/5" : "text-violet-400 hover:text-violet-600 hover:bg-violet-100/50"}`}>
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
