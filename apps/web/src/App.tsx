
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Page imports — we'll create these files next
// For now they don't exist yet, we'll add them one by one
// import HomePage from './pages/HomePage'
// import LoginPage from './pages/LoginPage'
// import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    // BrowserRouter — wraps EVERYTHING
    // Without this, routing doesn't work at all
    // Think of it as "activating" the router
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home Page — coming soon</div>} />
        <Route path="/auth/login" element={<div>Login Page — coming soon</div>} />
        <Route path="/dashboard" element={<div>Dashboard — coming soon</div>} />
        <Route path="*" element={<div>404 — Page not found</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
