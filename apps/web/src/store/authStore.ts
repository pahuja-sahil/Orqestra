import { create } from 'zustand'
import { useConverseStore } from './converseStore'

interface User {
  id: string
  email: string
  name: string
  profile_picture?: string
  is_2fa_enabled: boolean
}

interface AuthStore {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAccessToken: (token) =>
    set({ accessToken: token, isAuthenticated: true }),

  setUser: (user) =>
    set({ user }),

  logout: () => {
    useConverseStore.getState().clearMessages()
    localStorage.removeItem('orqestra-converse')
    set({ accessToken: null, user: null, isAuthenticated: false })
  },
}))