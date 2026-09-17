export type Role = 'ADMIN' | 'BIBLIOTHECAIRE' | 'ETUDIANT' | 'PROFESSEUR' | 'ADHERENT'

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

export interface RegisterRequest {
  nom: string
  prenom: string
  email: string
  password: string
  role?: Role
}

export interface LoginResponse {
  token: string
  role: Role
  id: number
  name: string
  email: string
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
  newPassword: string
}

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  category: string
  availableCopies: number
}

export interface Loan {
  id: number
  bookId: number
  userId: number
  status: 'BORROWED' | 'RETURNED'
  borrowedAt: string
  dueAt: string
}

export interface Reservation {
  id: number
  bookId: number
  userId: number
  status: 'WAITING' | 'READY_FOR_PICKUP' | 'CANCELED' | 'EXPIRED' | 'PICKED_UP'
  reservedAt: string
}

export interface DigitalAccess {
  bookId: number
  mode: 'FULL' | 'PREVIEW'
  fullAccess: boolean
  previewPageCount: number
  expiresAt?: string
  sourceType?: string
  accessToken?: string
  message: string
}
