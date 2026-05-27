import { create } from "zustand"
import { persist } from "zustand/middleware"

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
}

interface ConverseStore {
  messages: Message[]
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string
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
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id,
              timestamp: new Date(),
            },
          ],
        }))
        return id
      },

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
    }
  )
)