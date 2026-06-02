import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './store/themeStore'

function Root() {
  const { isDark } = useThemeStore()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <>
      <App />
      <Toaster
        position="bottom-right"
        closeButton
        expand
        visibleToasts={5}
        theme={isDark ? "dark" : "light"}
        toastOptions={{
          style: {
            zIndex: 9999,
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '14px',
            background: 'var(--bg-toast)',
            border: '2px solid var(--border)',
            color: 'var(--text-primary)',
            flexDirection: 'row',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
        }}
        icons={{
          success: (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          error: (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
          ),
        }}
      />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)