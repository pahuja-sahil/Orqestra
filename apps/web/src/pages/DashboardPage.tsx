import { Outlet } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import Sidebar from "@/components/dashboard/Sidebar"
import { Sun, Moon } from "lucide-react"

export default function DashboardPage() {
  const { isDark, toggle } = useThemeStore()

  return (
    <div className="min-h-screen theme-root bg-[var(--bg-page)]">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-end px-6 py-4 bg-[var(--bg-page)]/80 backdrop-blur-xl">
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2.5 rounded-full border-2 border-[var(--border)] bg-[var(--bg-element)] text-[var(--text-accent)] hover:brightness-110"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}