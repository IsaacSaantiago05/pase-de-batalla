import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AdministratorsPage } from './pages/AdministratorsPage'
import { BusinessClientsPage } from './pages/BusinessClientsPage'
import { BusinessPointsPage } from './pages/BusinessPointsPage'
import { PointAdjustmentsPage } from './pages/PointAdjustmentsPage'
import { LoginPage } from './pages/LoginPage'
import { ProductsAdminPage } from './pages/ProductsAdminPage'
import { QrManagementPage } from './pages/QrManagementPage'
import { RedemptionsAdminPage } from './pages/RedemptionsAdminPage'
import { RewardsAdminPage } from './pages/RewardsAdminPage'
import { SalesAdminPage } from './pages/SalesAdminPage'
import { ShellPage } from './pages/ShellPage'
import { StatisticsPage } from './pages/StatisticsPage'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/dashboard" element={<ShellPage title="Dashboard" />} />
          <Route path="/business" element={<ShellPage title="Mi Negocio" />} />
          <Route path="/products" element={<ProductsAdminPage />} />
          <Route path="/sales" element={<SalesAdminPage />} />
          <Route path="/clients" element={<BusinessClientsPage />} />
          <Route path="/adjustments" element={<PointAdjustmentsPage />} />
          <Route path="/qr"element={<QrManagementPage />} />
          <Route path="/points" element={<BusinessPointsPage />} />
          <Route path="/rewards" element={<RewardsAdminPage />} />
          <Route path="/redemptions" element={<RedemptionsAdminPage />} />
          <Route path="/history" element={<ShellPage title="Historial" />} />
          <Route path="/users" element={<ShellPage title="Usuarios" />} />
          <Route path="/businesses" element={<ShellPage title="Negocios" />} />
          <Route path="/administrators" element={<AdministratorsPage />} />
          <Route path="/levels" element={<ShellPage title="Niveles" />} />
          <Route path="/island-elements" element={<ShellPage title="Elementos de Isla" />} />
          <Route path="/point-rules" element={<ShellPage title="Reglas de Puntos" />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App
