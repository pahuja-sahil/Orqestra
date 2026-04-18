import { create } from "zustand"

interface Message {
  id: string
  type: "user" | "nexus"
  content: string
  inputMode: "voice" | "text"
  timestamp: Date
}

interface ConverseStore {
  messages: Message[]
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
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

  clearMessages: () => set({ messages: [] }),
}))