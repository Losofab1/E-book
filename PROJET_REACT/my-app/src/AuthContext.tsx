import { createContext, useContext, useState, type ReactNode } from 'react'
import { readStorage, writeStorage } from './utils/storage'
import { authService } from './services/authService'
import { profileService } from './services/profileService'

type Role = 'admin' | 'bibliothecaire' | 'etudiant' | 'professeur' | 'externe'

export interface User {
  name: string
  email: string
  role: Role
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>
  logout: () => void
  adminRegisterUser: (name: string, email: string, password: string, role: Role) => Promise<boolean>
  deleteUser: (email: string) => Promise<boolean>
  getAllUsers: () => StoredUser[]
  getUserByEmail: (email: string) => StoredUser | undefined
  updateCredentials: (payload: { name?: string; email?: string; password?: string }) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const STORAGE_KEY = 'losofab_auth_user'
const USER_LIST_KEY = 'losofab_users'
const LOGIN_ATTEMPTS_KEY = 'losofab_login_attempts'
const JWT_STORAGE_KEY = 'jwt_token'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 60_000

export interface StoredUser {
  name: string
  email: string
  password: string
  role: Role
  status: 'actif' | 'inactif'
}

const normalizeBackendRole = (role: string): Role => {
  const value = role.toUpperCase()

  if (value === 'ADMIN') return 'admin'
  if (value === 'BIBLIOTHECAIRE') return 'bibliothecaire'
  if (value === 'ETUDIANT') return 'etudiant'
  if (value === 'PROFESSEUR') return 'professeur'
  if (value === 'EXTERNE') return 'externe'

  return 'etudiant'
}

const defaultUsers: StoredUser[] = [
  { name: 'Admin System', email: 'admin@losofab', password: 'Admin123!', role: 'admin', status: 'actif' },
  { name: 'Bibli Thecaire', email: 'biblio@losofab', password: 'Biblio123!', role: 'bibliothecaire', status: 'actif' },
]

function getStoredUsers(): StoredUser[] {
  let users = readStorage<StoredUser[]>(USER_LIST_KEY, defaultUsers)

  if (!Array.isArray(users) || users.length === 0) {
    users = defaultUsers
  }

  // Vérifier et auto-réparer le compte admin dans la liste
  const adminIdx = users.findIndex((u) => u.email.toLowerCase() === 'admin@losofab')
  if (adminIdx === -1) {
    users.unshift({ name: 'Admin System', email: 'admin@losofab', password: 'Admin123!', role: 'admin', status: 'actif' })
  } else {
    users[adminIdx] = {
      ...users[adminIdx],
      name: 'Admin System',
      email: 'admin@losofab',
      role: 'admin',
      status: 'actif',
      password: users[adminIdx].password || 'Admin123!',
    }
  }

  // Vérifier et auto-réparer le compte bibliothécaire dans la liste
  const biblioIdx = users.findIndex((u) => u.email.toLowerCase() === 'biblio@losofab')
  if (biblioIdx === -1) {
    users.push({ name: 'Bibli Thecaire', email: 'biblio@losofab', password: 'Biblio123!', role: 'bibliothecaire', status: 'actif' })
  } else {
    users[biblioIdx] = {
      ...users[biblioIdx],
      name: 'Bibli Thecaire',
      email: 'biblio@losofab',
      role: 'bibliothecaire',
      status: 'actif',
      password: users[biblioIdx].password || 'Biblio123!',
    }
  }

  writeStorage(USER_LIST_KEY, users)
  return users
}

function saveStoredUsers(users: StoredUser[]) {
  writeStorage(USER_LIST_KEY, users)
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
    if (attempts.lockedUntil > now) return false

    try {
      const response = await authService.login({ email, password })
      const backendUser = response.data.user
      const userRole = normalizeBackendRole(backendUser.role)

      const nextUser: User = {
        name: backendUser.name,
        email: backendUser.email,
        role: userRole,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      localStorage.setItem(JWT_STORAGE_KEY, response.data.token)
      setUser(nextUser)

      writeStorage(LOGIN_ATTEMPTS_KEY, { count: 0, lockedUntil: 0 })
      return true
    } catch {
      // Fallback local de sécurité pour conserver les comptes de démonstration de l’application.
      let users = getStoredUsers()

      if (email === 'admin@losofab' && password === 'Admin123!') {
        const adminIdx = users.findIndex((u) => u.email.toLowerCase() === 'admin@losofab')
        if (adminIdx !== -1 && users[adminIdx].password !== 'Admin123!') {
          users[adminIdx].password = 'Admin123!'
          users[adminIdx].status = 'actif'
          saveStoredUsers(users)
        }
      }

      if (email === 'biblio@losofab' && password === 'Biblio123!') {
        const biblioIdx = users.findIndex((u) => u.email.toLowerCase() === 'biblio@losofab')
        if (biblioIdx !== -1 && users[biblioIdx].password !== 'Biblio123!') {
          users[biblioIdx].password = 'Biblio123!'
          users[biblioIdx].status = 'actif'
          saveStoredUsers(users)
        }
      }

      const found = users.find(
        (item) => item.email.toLowerCase() === email && item.password === password && item.status === 'actif'
      )
      if (!found) {
        const nextCount = attempts.count + 1
        writeStorage(LOGIN_ATTEMPTS_KEY, {
          count: nextCount >= MAX_LOGIN_ATTEMPTS ? 0 : nextCount,
          lockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0,
        })
        return false
      }

      writeStorage(LOGIN_ATTEMPTS_KEY, { count: 0, lockedUntil: 0 })

      const nextUser: User = { name: found.name, email: found.email, role: found.role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
      return true
    }
  }

  const register = async (name: string, email: string, password: string, role: Role) => {
    const users = getStoredUsers()
    const existing = users.some((item) => item.email.toLowerCase() === email.toLowerCase())
    if (existing) return false

    const newUser: StoredUser = { name, email, password, role, status: 'actif' }
    saveStoredUsers([...users, newUser])

    const nextUser: User = { name, email, role }
    writeStorage(STORAGE_KEY, nextUser)
    setUser(nextUser)
    return true
  }

  const adminRegisterUser = async (name: string, email: string, password: string, role: Role) => {
    const users = getStoredUsers()
    const existing = users.some((item) => item.email.toLowerCase() === email.toLowerCase())
    if (existing) return false

    const newUser: StoredUser = { name, email, password, role, status: 'actif' }
    saveStoredUsers([...users, newUser])
    return true
  }

  const deleteUser = async (email: string) => {
    const users = getStoredUsers()
    const filtered = users.filter((item) => item.email.toLowerCase() !== email.toLowerCase())
    if (filtered.length === users.length) return false
    saveStoredUsers(filtered)
    return true
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

      const serverProfile = response.data?.data ?? response.data
      const nextName = (serverProfile.name ?? payload.name ?? current.name).trim()
      const nextEmail = (serverProfile.email ?? payload.email ?? current.email).trim().toLowerCase()
      const nextRole = current.role

      const nextUser: User = {
        name: nextName,
        email: nextEmail,
        role: nextRole,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
      return true
    } catch {
      const users = getStoredUsers()
      const index = users.findIndex((item) => item.email.toLowerCase() === current.email.toLowerCase())
      if (index === -1) return false

      const targetEmail = (payload.email ?? current.email).trim().toLowerCase()
      const duplicate = users.some((item) => item.email.toLowerCase() === targetEmail && item.email.toLowerCase() !== current.email.toLowerCase())
      if (duplicate) return false

      const targetUser = users[index]
      const nextName = payload.name?.trim() || targetUser.name
      const nextPassword = payload.password?.trim() || targetUser.password
      const nextEmail = targetEmail

      users[index] = {
        ...targetUser,
        name: nextName,
        email: nextEmail,
        password: nextPassword,
      }

      saveStoredUsers(users)

      const nextUser: User = {
        name: nextName,
        email: nextEmail,
        role: targetUser.role,
      }

      writeStorage(STORAGE_KEY, nextUser)
      setUser(nextUser)
      return true
    }
  }

  const getAllUsers = () => {
    return getStoredUsers()
  }

  const getUserByEmail = (email: string) => {
    return getStoredUsers().find((item) => item.email.toLowerCase() === email.toLowerCase())
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(JWT_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, adminRegisterUser, deleteUser, getAllUsers, getUserByEmail, updateCredentials }}>
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
