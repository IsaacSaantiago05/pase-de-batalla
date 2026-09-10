import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages'
import { ShellPage } from './pages/AppPages'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<ShellPage title="Inicio" />} />
          <Route path="/island" element={<ShellPage title="Mi Isla" />} />
          <Route path="/battle-pass" element={<ShellPage title="Pase de Batalla" />} />
          <Route path="/points" element={<ShellPage title="Puntos" />} />
          <Route path="/scan-qr" element={<ShellPage title="Escanear QR" />} />
          <Route path="/rewards" element={<ShellPage title="Recompensas" />} />
          <Route path="/rewards/:id" element={<ShellPage title="Detalle de Recompensa" />} />
          <Route path="/redemptions" element={<ShellPage title="Canjes" />} />
          <Route path="/history" element={<ShellPage title="Historial" />} />
          <Route path="/businesses" element={<ShellPage title="Negocios" />} />
          <Route path="/profile" element={<ShellPage title="Perfil" />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  )
}

export default App
