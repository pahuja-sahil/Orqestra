import { create } from "zustand"

interface Message {
  id: string
  type: "user" | "orqestra"
  content: string
  inputMode: "voice" | "text"
  timestamp: Date
  isPrResult?: boolean
  hasCode?: boolean
  apiName?: string
  isCompleted?: boolean
}

interface ConverseStore {
  messages: Message[]
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
  markPrDone: (id: string) => void
  markCompleted: (id: string) => void
  clearMessages: () => void
}

export const useConverseStore = create<ConverseStore>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),

  markPrDone: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isPrResult: true } : m
      ),
    })),

  markCompleted: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isCompleted: true } : m
      ),
    })),

  clearMessages: () => set({ messages: [] }),
}))