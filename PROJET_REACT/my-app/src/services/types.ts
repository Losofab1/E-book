export type Role = 'ADMIN' | 'BIBLIOTHECAIRE' | 'ETUDIANT' | 'PROFESSEUR' | 'EXTERNE'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface Profile {
  id?: string
  name?: string
  firstname?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  password?: string
  role?: Role
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    name: string
    email: string
    role: Role
  }
}

export interface CoordinateUpdatePayload {
  name?: string
  firstname?: string
  email?: string
  phone?: string
  address?: string
  city?: string
}

export interface PasswordRecoveryRequest {
  email: string
}

export interface PasswordResetRequest {
  token: string
  password: string
  confirmPassword: string
}

export interface Book {
  id: string
  title: string
  author: string
  category: string
  status: 'available' | 'loaned' | 'reserved'
}

export interface Loan {
  id: string
  bookId: string
  userEmail: string
  status: 'active' | 'returned' | 'overdue'
  startDate: string
  endDate: string
}

export interface Reservation {
  id: string
  bookId: string
  userEmail: string
  status: 'pending' | 'confirmed' | 'cancelled'
  requestedAt: string
}

export interface DigitalAccess {
  id: string
  bookId: string
  userEmail: string
  role: string
  expiresAt: string
  granted: boolean
}
