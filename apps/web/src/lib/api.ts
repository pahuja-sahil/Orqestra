import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const res = await api.post(
          '/api/auth/refresh',
          {},
        )
        const newToken = res.data.access_token
        useAuthStore.getState().setAccessToken(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api