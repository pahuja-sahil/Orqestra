import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import TwoFactorPage from './pages/TwoFactorPage'
import OverviewPage from './pages/dashboard/OverviewPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ConversePage from './pages/dashboard/ConversePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }>
          <Route index element={<OverviewPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="converse" element={<ConversePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App