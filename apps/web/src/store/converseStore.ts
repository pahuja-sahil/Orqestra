import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

localStorage.removeItem("orqestra-converse")

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
  awaitingPrConfirm?: boolean
  isPlaceholder?: boolean
}

interface ConverseStore {
  messages: Message[]
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string
  updateMessage: (id: string, updates: Partial<Message>) => void
  removeMessage: (id: string) => void
  markPrDone: (id: string) => void
  markCompleted: (id: string) => void
  setAwaitingPrConfirm: (id: string, value: boolean) => void
  clearMessages: () => void
}

export const useConverseStore = create<ConverseStore>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (message) => {
        const id = crypto.randomUUID()
        set((state) => {
          const MAX_MESSAGES = 50
          const messages = [
            ...state.messages,
            {
              ...message,
              id,
              timestamp: new Date(),
            },
          ]
          if (messages.length > MAX_MESSAGES) {
            return { messages: messages.slice(-MAX_MESSAGES) }
          }
          return { messages }
        })
        return id
      },

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
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

      setAwaitingPrConfirm: (id, value) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, awaitingPrConfirm: value } : m
          ),
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "orqestra-converse",
      partialize: (state) => ({ messages: state.messages }),
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)