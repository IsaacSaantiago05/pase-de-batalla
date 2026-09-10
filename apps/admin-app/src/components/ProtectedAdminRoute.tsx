import { Navigate, Outlet } from 'react-router-dom'
import { getAdminSession } from '../lib/auth'

const allowed = ['ADMINISTRADOR_GENERAL', 'ADMINISTRADOR_NEGOCIO']

export function ProtectedAdminRoute() {
  const session = getAdminSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!allowed.includes(session.role)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
