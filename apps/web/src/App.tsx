import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import TwoFactorPage from './pages/TwoFactorPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import OverviewPage from './pages/dashboard/OverviewPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ConversePage from './pages/dashboard/ConversePage'
import IntegrationsPage from './pages/dashboard/IntegrationsPage'
import AgentsPage from './pages/dashboard/AgentsPage'
import LogsPage from './pages/dashboard/LogsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }>
          <Route index element={<OverviewPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="converse" element={<ConversePage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App