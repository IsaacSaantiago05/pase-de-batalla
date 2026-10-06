import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import { ShellPage } from './pages/AppPages'

const IslandPage = lazy(() => import('./pages/IslandPage').then((module) => ({ default: module.IslandPage })))
const BattlePassPage = lazy(() => import('./pages/BattlePassPage').then((module) => ({ default: module.BattlePassPage })))
const PointsPage = lazy(() => import('./pages/PointsPages').then((module) => ({ default: module.PointsPage })))
const HistoryPage = lazy(() => import('./pages/PointsPages').then((module) => ({ default: module.HistoryPage })))
const QrRedeemPage = lazy(() => import('./pages/QrRedeemPage').then((module) => ({ default: module.QrRedeemPage })))
const RewardsPage = lazy(() => import('./pages/RewardsPages').then((module) => ({ default: module.RewardsPage })))
const RedemptionsPage = lazy(() => import('./pages/RewardsPages').then((module) => ({ default: module.RedemptionsPage })))

function RouteLoadingFallback() {
  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      Cargando modulo...
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/home"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShellPage title="Inicio" />
              </Suspense>
            }
          />
          <Route
            path="/island"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <IslandPage />
              </Suspense>
            }
          />
          <Route
            path="/battle-pass"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <BattlePassPage />
              </Suspense>
            }
          />
          <Route
            path="/points"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <PointsPage />
              </Suspense>
            }
          />
          <Route
            path="/scan-qr"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <QrRedeemPage />
              </Suspense>
            }
          />
          <Route
            path="/rewards"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <RewardsPage />
              </Suspense>
            }
          />
          <Route
            path="/rewards/:id"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShellPage title="Detalle de Recompensa" />
              </Suspense>
            }
          />
          <Route
            path="/redemptions"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <RedemptionsPage />
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <HistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/businesses"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShellPage title="Negocios" />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShellPage title="Perfil" />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  )
}

export default App
