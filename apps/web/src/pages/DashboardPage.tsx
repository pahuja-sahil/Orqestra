import { Outlet } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import Sidebar from "@/components/dashboard/Sidebar"
import { Sun, Moon } from "lucide-react"

export default function DashboardPage() {
  const { isDark, toggle } = useThemeStore()

  return (
    <div
      className="min-h-screen"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 20% 50%, rgba(120,0,0,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(100,0,0,0.05) 0%, transparent 40%), #050008"
          : "radial-gradient(ellipse at 20% 50%, rgba(220,20,60,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(220,20,60,0.03) 0%, transparent 40%), #fafafa",
      }}
    >
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <header
          className={`sticky top-0 z-30 flex items-center justify-end px-6 py-4 ${
            isDark
              ? "bg-[#050008]/80 backdrop-blur-xl"
              : "bg-[#fafafa]/80 backdrop-blur-xl"
          }`}
        >
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`p-2.5 rounded-full border-2 ${
              isDark
                ? "border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/60 hover:border-red-600"
                : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400"
            }`}
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