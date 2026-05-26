import { Outlet } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import Sidebar from "@/components/dashboard/Sidebar"
import { Sun, Moon } from "lucide-react"

export default function DashboardPage() {
  const { isDark, toggle } = useThemeStore()

  return (
    <div className="min-h-screen theme-transition"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 20% 50%, rgba(76,29,149,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(46,16,101,0.05) 0%, transparent 40%), #09090b"
          : "radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.04) 0%, transparent 40%), #FDFBF7",
      }}
    >
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-end px-6 py-4 theme-transition dark:bg-zinc-950/80 bg-[#FDFBF7]/80 backdrop-blur-xl">
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2.5 rounded-full border-2 theme-transition dark:border-violet-800 border-violet-300 dark:bg-violet-950/50 bg-violet-50 dark:text-violet-400 text-violet-700 hover:dark:bg-violet-900/60 hover:bg-violet-100 hover:dark:border-violet-600 hover:border-violet-400"
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