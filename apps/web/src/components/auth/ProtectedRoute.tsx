import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const { isAuthenticated, setAccessToken, setUser } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const verify = async () => {
      if (isAuthenticated) {
        setChecking(false)
        return
      }
      try {
        const refreshRes = await api.post("/api/auth/refresh")
        const token = refreshRes.data.access_token
        setAccessToken(token)

        const userRes = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(userRes.data)
        setChecking(false)
      } catch {
        navigate("/auth/login")
      }
    }
    verify()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return <>{children}</>
}