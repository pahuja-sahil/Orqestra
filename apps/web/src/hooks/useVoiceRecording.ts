import { useState, useRef, useCallback } from "react"

export type VoiceState = "idle" | "recording" | "processing" | "responding" | "error"

export type ProcessingStage = 
  | "transcribing" 
  | "thinking" 
  | "synthesizing" 
  | null

interface UseVoiceRecordingReturn {
  voiceState: VoiceState
  processingStage: ProcessingStage
  transcript: string
  response: string
  error: string | null
  isSupported: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  reset: () => void
}

export function useVoiceRecording(
  accessToken: string | null,
  onTranscript?: (text: string) => void
): UseVoiceRecordingReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isSupported = typeof window !== "undefined" &&
    !!navigator.mediaDevices &&
    !!window.MediaRecorder

const getWsUrl = useCallback(() => {
  const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000"
  return apiBase.replace(/^http/, "ws") + "/api/converse/ws"
}, [])

const connectWebSocket = useCallback((): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!accessToken) {
      reject(new Error("Not authenticated"))
      return
    }

    let resolved = false
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    // Keepalive ping every 15 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 15000)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "auth",
        token: accessToken
      }))
    }

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case "auth_ok":
          resolved = true
          resolve()
          break

        case "chunk_received":
          break

        case "pong":
          break

        case "processing":
          setVoiceState("processing")
          setProcessingStage(data.stage as ProcessingStage)
          break

        case "transcript":
          setTranscript(data.text)
          onTranscript?.(data.text)
          break

        case "response":
          setResponse(data.text)
          setVoiceState("responding")
          break

        case "audio": {
          const binaryStr = atob(data.data)
          const audioArray = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) {
            audioArray[i] = binaryStr.charCodeAt(i)
          }
          const audioBlob = new Blob([audioArray], { type: "audio/mpeg" })
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          audio.play()
          break
        }

        case "complete":
          setVoiceState("idle")
          setProcessingStage(null)
          break

        case "error":
          setError(data.message)
          setVoiceState("error")
          setProcessingStage(null)
          if (!resolved) reject(new Error(data.message))
          break
      }
    }

    ws.onerror = () => {
      clearInterval(pingInterval)
      reject(new Error("WebSocket connection failed"))
    }

    ws.onclose = () => {
      clearInterval(pingInterval)
      wsRef.current = null
      if (!resolved) reject(new Error("WebSocket closed unexpectedly"))
    }
  })
}, [accessToken, onTranscript, getWsUrl])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Microphone access requires HTTPS or localhost. Check your browser permissions.")
      return
    }

    try {
      setError(null)
      setTranscript("")
      setResponse("")
      audioChunksRef.current = []

      await connectWebSocket()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      let seq = 0
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)

          const reader = new FileReader()
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1]
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "audio_chunk",
                seq: seq++,
                mimeType,
                data: base64
              }))
            }
          }
          reader.readAsDataURL(event.data)
        }
      }

      mediaRecorder.start(1000)
      setVoiceState("recording")

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording"
      setError(message)
      setVoiceState("error")
    }
  }, [isSupported, connectWebSocket])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && voiceState === "recording") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_stream" }))
    }

    setVoiceState("processing")
    setProcessingStage("transcribing")
  }, [voiceState])

  const reset = useCallback(() => {
    setVoiceState("idle")
    setProcessingStage(null)
    setTranscript("")
    setResponse("")
    setError(null)
    audioChunksRef.current = []

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  return {
    voiceState,
    processingStage,
    transcript,
    response,
    error,
    isSupported,
    startRecording,
    stopRecording,
    reset
  }
}