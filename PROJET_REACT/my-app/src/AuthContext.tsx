import axios from 'axios'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { readStorage, writeStorage } from './utils/storage'
import { authService } from './services/authService'
import { profileService } from './services/profileService'

type Role = 'admin' | 'bibliothecaire' | 'etudiant' | 'professeur' | 'adherent'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface LoginResult {
  success: boolean
  user?: User
  message?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<LoginResult>
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>
  logout: () => void
  updateCredentials: (payload: { name?: string; email?: string; password?: string }) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const STORAGE_KEY = 'losofab_auth_user'
const LOGIN_ATTEMPTS_KEY = 'losofab_login_attempts'
const JWT_STORAGE_KEY = 'jwt_token'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 60_000

const normalizeBackendRole = (role: string): Role => {
  const value = role?.toUpperCase?.() ?? ''

  if (value === 'ADMIN') return 'admin'
  if (value === 'BIBLIOTHECAIRE') return 'bibliothecaire'
  if (value === 'ADHERENT') return 'adherent'
  if (value === 'ETUDIANT') return 'etudiant'
  if (value === 'PROFESSEUR') return 'professeur'
  if (value === 'EXTERNE') return 'adherent'

  return 'adherent'
}

function getStoredUser(): User | null {
  return readStorage<User | null>(STORAGE_KEY, null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const login = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase()
    const password = passwordInput.trim()

    const now = Date.now()
    const attempts = readStorage<{ count: number; lockedUntil: number }>(LOGIN_ATTEMPTS_KEY, { count: 0, lockedUntil: 0 })
    if (attempts.lockedUntil > now) {
      return { success: false, message: 'Trop de tentatives. Réessayez dans une minute.' }
    }

    try {
      const response = await authService.login({ email, password })
      const backendRole = response.data.role
      const userRole = normalizeBackendRole(backendRole)
      const nextUser: User = {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        role: userRole,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      localStorage.setItem(JWT_STORAGE_KEY, response.data.token)
      setUser(nextUser)

      writeStorage(LOGIN_ATTEMPTS_KEY, { count: 0, lockedUntil: 0 })
      return { success: true, user: nextUser }
    } catch (error) {
      const nextCount = attempts.count + 1
      writeStorage(LOGIN_ATTEMPTS_KEY, {
        count: nextCount >= MAX_LOGIN_ATTEMPTS ? 0 : nextCount,
        lockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0,
      })
      if (axios.isAxiosError(error)) {
        const payload = error.response?.data as { fields?: Record<string, string> } | undefined
        const validationMessage = payload?.fields ? Object.values(payload.fields)[0] : undefined
        if (validationMessage) return { success: false, message: validationMessage }
      }

      return { success: false, message: 'Aucun compte correspondant ou identifiants incorrects.' }
    }
  }

  const register = async (name: string, email: string, password: string, role: Role) => {
    try {
      const parts = name.trim().split(/\s+/)
      const nom = parts.shift() ?? 'Utilisateur'
      const prenom = parts.join(' ') || 'Utilisateur'

      const response = await authService.register({
        nom,
        prenom,
        email: email.trim().toLowerCase(),
        password,
        role: role.toUpperCase() as 'ETUDIANT' | 'PROFESSEUR' | 'ADHERENT',
      })

      const nextUser: User = {
        id: response.data.id,
        name: name.trim() || 'Utilisateur',
        email: email.trim().toLowerCase(),
        role: normalizeBackendRole(response.data.role ?? role),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      localStorage.setItem(JWT_STORAGE_KEY, response.data.token)
      setUser(nextUser)
      return true
    } catch {
      return false
    }
  }

  const updateCredentials = async (payload: { name?: string; email?: string; password?: string }) => {
    const current = getStoredUser()
    if (!current) return false

    try {
      const response = await profileService.updateMe({
        name: payload.name,
        email: payload.email,
        password: payload.password,
      })

      const serverProfile = response.data
      const nextName = (serverProfile.name ?? payload.name ?? current.name).trim()
      const nextEmail = (serverProfile.email ?? payload.email ?? current.email).trim().toLowerCase()
      const nextRole = current.role

      const nextUser: User = {
        id: current.id,
        name: nextName,
        email: nextEmail,
        role: nextRole,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    void authService.logout().catch(() => undefined)
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(JWT_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateCredentials }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
