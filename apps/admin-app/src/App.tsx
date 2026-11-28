import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AccountPage } from './pages/AccountPage'
import { AdministratorsPage } from './pages/AdministratorsPage'
import { DashboardPage } from './pages/DashboardPage'
import { BusinessClientsPage } from './pages/BusinessClientsPage'
import { BusinessesPage } from './pages/BusinessesPage'
import { BusinessPointsPage } from './pages/BusinessPointsPage'
import { PointAdjustmentsPage } from './pages/PointAdjustmentsPage'
import { LoginPage } from './pages/LoginPage'
import { ProductsAdminPage } from './pages/ProductsAdminPage'
import { QrManagementPage } from './pages/QrManagementPage'
import { RedemptionsAdminPage } from './pages/RedemptionsAdminPage'
import { RewardsAdminPage } from './pages/RewardsAdminPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { MyBusinessPage } from './pages/MyBusinessPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ShellPage } from './pages/ShellPage'

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/business" element={<MyBusinessPage />} />
          <Route path="/products" element={<ProductsAdminPage />} />
          <Route path="/clients" element={<BusinessClientsPage />} />
          <Route path="/adjustments" element={<PointAdjustmentsPage />} />
          <Route path="/qr" element={<QrManagementPage />} />
          <Route path="/points" element={<BusinessPointsPage />} />
          <Route path="/rewards" element={<RewardsAdminPage />} />
          <Route path="/redemptions" element={<RedemptionsAdminPage />} />
          <Route path="/history" element={<ShellPage title="Historial" />} />
          <Route path="/users" element={<ShellPage title="Usuarios" />} />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/administrators" element={<AdministratorsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/levels" element={<ShellPage title="Niveles" />} />
          <Route path="/island-elements" element={<ShellPage title="Elementos de Isla" />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
