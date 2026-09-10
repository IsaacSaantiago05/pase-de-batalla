import { Navigate, Outlet } from 'react-router-dom'
import { getSession } from '../lib/auth'

type Props = {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const session = getSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
