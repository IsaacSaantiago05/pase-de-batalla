import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AdministratorsPage } from './pages/AdministratorsPage'
import { BusinessPointsPage } from './pages/BusinessPointsPage'
import { LoginPage } from './pages/LoginPage'
import { QrManagementPage } from './pages/QrManagementPage'
import { ShellPage } from './pages/ShellPage'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/dashboard" element={<ShellPage title="Dashboard" />} />
          <Route path="/business" element={<ShellPage title="Mi Negocio" />} />
          <Route path="/qr" element={<QrManagementPage />} />
          <Route path="/points" element={<BusinessPointsPage />} />
          <Route path="/rewards" element={<ShellPage title="Recompensas" />} />
          <Route path="/redemptions" element={<ShellPage title="Canjes" />} />
          <Route path="/history" element={<ShellPage title="Historial" />} />
          <Route path="/users" element={<ShellPage title="Usuarios" />} />
          <Route path="/businesses" element={<ShellPage title="Negocios" />} />
          <Route path="/administrators" element={<AdministratorsPage />} />
          <Route path="/levels" element={<ShellPage title="Niveles" />} />
          <Route path="/island-elements" element={<ShellPage title="Elementos de Isla" />} />
          <Route path="/point-rules" element={<ShellPage title="Reglas de Puntos" />} />
          <Route path="/statistics" element={<ShellPage title="Estadísticas" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App
