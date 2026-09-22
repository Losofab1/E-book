import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface RequireAuthProps {
  children: ReactNode
  allowedRole?: string | string[]
}

const RequireAuth = ({ children, allowedRole }: RequireAuthProps) => {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRole) {
    const roles = (Array.isArray(allowedRole) ? allowedRole : [allowedRole]).map((role) => role.toLowerCase())
    const userRole = auth.user.role.toLowerCase()

    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default RequireAuth
