import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useConverseStore } from "@/store/converseStore"
import { Mic, MicOff, Send, RotateCcw, Volume2, MessageSquare } from "lucide-react"
import ReactMarkdown from "react-markdown"
import api from "@/lib/api"

const TRANSITION = "transition-all duration-500 ease-in-out"

const processingMessages: Record<string, string[]> = {
  transcribing: ["Listening to your words...", "Converting speech to text...", "Processing your voice..."],
  thinking: ["Understanding your request...", "Analyzing requirements...", "Preparing response..."],
  synthesizing: ["Generating voice response...", "Preparing audio...", "Almost ready..."],
}

function WaveAnimation({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.8 + (i % 5) * 0.1,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
          className={`w-1 rounded-full ${TRANSITION} ${isDark ? "bg-red-500" : "bg-red-600"}`}
          style={{ height: `${20 + (i % 7) * 4}px` }}
        />
      ))}
    </div>
  )
}

function ProcessingAnimation({ stage, isDark }: { stage: string; isDark: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const messages = processingMessages[stage] || ["Processing..."]

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [stage, messages.length])

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative w-16 h-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border-2 border-t-transparent ${TRANSITION} ${
            isDark ? "border-red-600" : "border-red-500"
          }`}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-2 rounded-full border-2 border-b-transparent ${TRANSITION} ${
            isDark ? "border-red-900" : "border-red-300"
          }`}
        />
        <div className={`absolute inset-4 rounded-full ${TRANSITION} ${isDark ? "bg-red-950/60" : "bg-red-50"}`} />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className={`text-sm font-medium ${TRANSITION} ${isDark ? "text-slate-300" : "text-slate-700"}`}
        >
          {messages[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function NexusResponse({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className={`text-base font-bold mb-2 mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className={`text-sm font-bold mb-2 mt-3 ${isDark ? "text-white" : "text-slate-900"}`}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={`text-sm font-semibold mb-1 mt-2 ${isDark ? "text-red-400" : "text-red-600"}`}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className={`mb-2 leading-relaxed text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {children}
          </strong>
        ),
        ul: ({ children }) => (
          <ul className="space-y-1.5 mb-3 ml-0 list-none">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="space-y-1.5 mb-3 list-decimal list-inside">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className={`flex items-start gap-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? "bg-red-500" : "bg-red-500"}`} />
            <span className="flex-1">{children}</span>
          </li>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-")
          return isBlock ? (
            <pre className={`p-3 rounded-xl text-xs overflow-x-auto my-2 ${
              isDark
                ? "bg-black/50 text-green-400 border border-white/10"
                : "bg-slate-50 text-slate-800 border border-slate-200"
            }`}>
              <code>{children}</code>
            </pre>
          ) : (
            <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
              isDark ? "bg-white/10 text-red-300" : "bg-red-50 text-red-700"
            }`}>
              {children}
            </code>
          )
        },
        a: ({ href, children }) => (
          <a
            href={href ?? ""}
            target={"_blank"}
            rel={"noopener noreferrer"}
            className={`underline underline-offset-2 ${
              isDark ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"
            }`}
          >
            {children}
          </a>
        ),
        em: ({ children }) => (
          <em className={`not-italic text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function ConversePage() {
  const { isDark } = useThemeStore()
  const { accessToken } = useAuthStore()
  const { messages, addMessage, clearMessages } = useConverseStore()
  const [textInput, setTextInput] = useState("")
  const [textLoading, setTextLoading] = useState(false)

  const {
    voiceState,
    processingStage,
    response,
    error,
    isSupported,
    startRecording,
    stopRecording,
    reset,
  } = useVoiceRecording(accessToken, (text) => {
    addMessage({ type: "user", content: text, inputMode: "voice" })
  })

  useEffect(() => {
    if (response) {
      addMessage({ type: "nexus", content: response, inputMode: "voice" })
    }
  }, [response])

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    const userText = textInput
    setTextLoading(true)
    setTextInput("")
    addMessage({ type: "user", content: userText, inputMode: "text" })
    try {
      const res = await api.post(
        "/api/converse/process",
        { text: userText },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      addMessage({ type: "nexus", content: res.data.response, inputMode: "text" })
    } catch {
      addMessage({ type: "nexus", content: "Something went wrong. Please try again.", inputMode: "text" })
    } finally {
      setTextLoading(false)
    }
  }

  const handleMicClick = () => {
    if (voiceState === "idle") startRecording()
    else if (voiceState === "recording") stopRecording()
  }

  const handleClear = () => {
    reset()
    setTextInput("")
    clearMessages()
  }

  const isRecording = voiceState === "recording"
  const isProcessing = voiceState === "processing"
  const isResponding = voiceState === "responding"

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-3xl mx-auto w-full"
    >
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${TRANSITION} ${isDark ? "text-white" : "text-slate-900"}`}>
          Converse
        </h1>
        <p className={`text-sm ${TRANSITION} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Talk to NEXUS — speak or type, we handle the rest
        </p>
      </div>

      <motion.div
        layout
        className={`rounded-3xl border p-8 mb-4 ${TRANSITION} ${
          isDark
            ? "border-red-950/50 bg-[#0a000f]/80 shadow-xl shadow-black/40"
            : "border-red-200/80 bg-white shadow-xl shadow-red-100/60"
        }`}
      >
        <div className="flex flex-col items-center gap-6">

          <AnimatePresence mode="wait">
            {voiceState === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col items-center gap-3 py-2"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 0 0 ${isDark ? "rgba(220,20,60,0.35)" : "rgba(220,20,60,0.25)"}`,
                      `0 0 0 18px rgba(220,20,60,0)`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full"
                >
                  <button
                    onClick={handleMicClick}
                    disabled={!isSupported}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${TRANSITION} ${
                      isDark
                        ? "border-red-800 bg-red-950/60 text-red-400 hover:bg-red-900/70 hover:border-red-600"
                        : "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-500 shadow-lg shadow-red-200/50"
                    }`}
                  >
                    <Mic size={28} />
                  </button>
                </motion.div>
                <p className={`text-sm font-medium ${TRANSITION} ${isDark ? "text-slate-400" : "text-red-500"}`}>
                  {isSupported ? "Tap to speak" : "Microphone not supported"}
                </p>
              </motion.div>
            )}

            {isRecording && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <WaveAnimation isDark={isDark} />
                <button
                  onClick={handleMicClick}
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${TRANSITION} ${
                    isDark
                      ? "border-red-600 bg-red-700/60 text-white shadow-lg shadow-red-950/50"
                      : "border-red-500 bg-red-600 text-white shadow-lg shadow-red-300/50"
                  }`}
                >
                  <MicOff size={22} />
                </button>
                <p className={`text-sm font-medium ${TRANSITION} ${isDark ? "text-red-400" : "text-red-600"}`}>
                  Recording — tap to stop
                </p>
              </motion.div>
            )}

            {isProcessing && processingStage && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ProcessingAnimation stage={processingStage} isDark={isDark} />
              </motion.div>
            )}

            {isResponding && (
              <motion.div
                key="responding"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col items-center gap-3 py-2"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${TRANSITION} ${
                    isDark
                      ? "border-red-800 bg-red-950/60 shadow-lg shadow-red-950/40"
                      : "border-red-300 bg-red-50 shadow-lg shadow-red-200/50"
                  }`}
                >
                  <Volume2 size={24} className={`${TRANSITION} ${isDark ? "text-red-400" : "text-red-600"}`} />
                </motion.div>
                <p className={`text-sm font-medium ${TRANSITION} ${isDark ? "text-slate-300" : "text-red-600"}`}>
                  NEXUS is responding...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          {(messages.length > 0 || textLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full space-y-3"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-2xl ${TRANSITION} ${
                    msg.type === "user"
                      ? isDark
                        ? "bg-white/5 border border-white/10"
                        : "bg-red-50 border border-red-200 shadow-sm shadow-red-100"
                      : isDark
                        ? "bg-red-950/30 border border-red-900/40 shadow-lg shadow-red-950/20"
                        : "bg-gradient-to-br from-red-50 to-white border border-red-200 shadow-md shadow-red-100/60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {msg.type === "user" ? (
                      <>
                        {msg.inputMode === "voice"
                          ? <Mic size={12} className={`${TRANSITION} ${isDark ? "text-slate-500" : "text-red-400"}`} />
                          : <MessageSquare size={12} className={`${TRANSITION} ${isDark ? "text-slate-500" : "text-red-400"}`} />
                        }
                        <p className={`text-xs font-semibold tracking-wider ${TRANSITION} ${isDark ? "text-slate-500" : "text-red-400"}`}>
                          {msg.inputMode === "voice" ? "YOU SAID" : "YOU TYPED"}
                        </p>
                      </>
                    ) : (
                      <p className={`text-xs font-semibold tracking-wider ${TRANSITION} ${isDark ? "text-red-400" : "text-red-600"}`}>
                        NEXUS
                      </p>
                    )}
                  </div>
                  {msg.type === "user" ? (
                    <p className={`text-sm leading-relaxed ${TRANSITION} ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {msg.content}
                    </p>
                  ) : (
                    <NexusResponse content={msg.content} isDark={isDark} />
                  )}
                </motion.div>
              ))}

              {textLoading && (
                <div className={`p-5 rounded-2xl ${TRANSITION} ${
                  isDark
                    ? "bg-red-950/30 border border-red-900/40 shadow-lg shadow-red-950/20"
                    : "bg-gradient-to-br from-red-50 to-white border border-red-200 shadow-md shadow-red-100/60"
                }`}>
                  <p className={`text-xs font-semibold tracking-wider mb-3 ${TRANSITION} ${isDark ? "text-red-400" : "text-red-600"}`}>
                    NEXUS
                  </p>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className={`w-4 h-4 border-2 border-t-transparent rounded-full ${TRANSITION} ${
                        isDark ? "border-red-500" : "border-red-600"
                      }`}
                    />
                    <p className={`text-sm ${TRANSITION} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Processing...
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleClear}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl ${TRANSITION} ${
                    isDark
                      ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      : "text-red-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className={`rounded-3xl border p-4 ${TRANSITION} ${
        isDark
          ? "border-red-950/50 bg-[#0a000f]/80 shadow-xl shadow-black/30"
          : "border-red-200/80 bg-white shadow-xl shadow-red-100/50"
      }`}>
        <div className="flex items-end gap-3">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleTextSubmit()
              }
            }}
            placeholder="Or type your command here... (Enter to send)"
            rows={2}
            className={`flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none border ${TRANSITION} ${
              isDark
                ? "bg-white/5 border-red-950/50 text-white placeholder:text-slate-600 focus:border-red-800"
                : "bg-red-50/40 border-red-200 text-slate-900 placeholder:text-red-300 focus:border-red-400 focus:bg-white"
            }`}
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || textLoading}
            className={`p-3.5 rounded-2xl border-2 flex-shrink-0 ${TRANSITION} ${
              textInput.trim()
                ? isDark
                  ? "border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/60 hover:border-red-600"
                  : "border-red-500 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-300/40"
                : isDark
                  ? "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                  : "border-red-100 bg-transparent text-red-200 cursor-not-allowed"
            }`}
          >
            {textLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={`w-5 h-5 border-2 border-t-transparent rounded-full ${TRANSITION} ${
                  isDark ? "border-red-400" : "border-white"
                }`}
              />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}