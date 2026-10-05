import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import { BattlePassPage } from './pages/BattlePassPage'
import { IslandPage } from './pages/IslandPage'
import { ShellPage } from './pages/AppPages'
import { HistoryPage, PointsPage } from './pages/PointsPages'
import { QrRedeemPage } from './pages/QrRedeemPage'
import { RedemptionsPage, RewardsPage } from './pages/RewardsPages'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<ShellPage title="Inicio" />} />
          <Route path="/island" element={<IslandPage />} />
          <Route path="/battle-pass" element={<BattlePassPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/scan-qr" element={<QrRedeemPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/rewards/:id" element={<ShellPage title="Detalle de Recompensa" />} />
          <Route path="/redemptions" element={<RedemptionsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/businesses" element={<ShellPage title="Negocios" />} />
          <Route path="/profile" element={<ShellPage title="Perfil" />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  )
}

export default App
