// REPLACE the entire file with this:
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
        richColors
        theme={isDark ? "dark" : "light"}
        toastOptions={{
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
          },
        }}
      />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)