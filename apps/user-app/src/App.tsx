import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from '@shared/ui'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import { SplashPage } from './pages/SplashPage'

const IslandPage = lazy(() => import('./pages/IslandPage').then((module) => ({ default: module.IslandPage })))
const BattlePassPage = lazy(() => import('./pages/BattlePassPage').then((module) => ({ default: module.BattlePassPage })))
const PointsPage = lazy(() => import('./pages/PointsPages').then((module) => ({ default: module.PointsPage })))
const HistoryPage = lazy(() => import('./pages/PointsPages').then((module) => ({ default: module.HistoryPage })))
const QrRedeemPage = lazy(() => import('./pages/QrRedeemPage').then((module) => ({ default: module.QrRedeemPage })))
const RewardsPage = lazy(() => import('./pages/RewardsPages').then((module) => ({ default: module.RewardsPage })))
const RedemptionsPage = lazy(() => import('./pages/RewardsPages').then((module) => ({ default: module.RedemptionsPage })))
const BusinessesPage = lazy(() => import('./pages/BusinessesPage').then((module) => ({ default: module.BusinessesPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const RewardDetailPage = lazy(() => import('./pages/RewardDetailPage').then((module) => ({ default: module.RewardDetailPage })))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState text="Cargando modulo..." />}>{children}</Suspense>
}

const PROTECTED = [
  { path: '/home', element: <HomePage /> },
  { path: '/island', element: <IslandPage /> },
  { path: '/battle-pass', element: <BattlePassPage /> },
  { path: '/points', element: <PointsPage /> },
  { path: '/scan-qr', element: <QrRedeemPage /> },
  { path: '/rewards', element: <RewardsPage /> },
  { path: '/rewards/:id', element: <RewardDetailPage /> },
  { path: '/redemptions', element: <RedemptionsPage /> },
  { path: '/history', element: <HistoryPage /> },
  { path: '/businesses', element: <BusinessesPage /> },
  { path: '/profile', element: <ProfilePage /> },
]

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/welcome" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          {PROTECTED.map((route) => (
            <Route element={<Lazy>{route.element}</Lazy>} key={route.path} path={route.path} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}

export default App
