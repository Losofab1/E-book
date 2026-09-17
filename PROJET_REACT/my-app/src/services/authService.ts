import { api } from './api'
import type { LoginRequest, LoginResponse, PasswordRecoveryRequest, PasswordResetRequest, RegisterRequest, Role } from './types'

export type AuthRole = Role

export interface LoginPayload extends LoginRequest {}

export interface AuthenticatedUser {
  name: string
  email: string
  role: AuthRole
}

export interface AuthLoginResponse extends LoginResponse {}

export const authService = {
  async login(payload: LoginPayload) {
    return api.post<AuthLoginResponse>('/auth/login', payload)
  },

  async register(payload: RegisterRequest) {
    return api.post<AuthLoginResponse>('/auth/register', payload)
  },

  async getProfile() {
    return api.get<AuthenticatedUser>('/auth/profile')
  },

  async logout() {
    return api.post('/auth/logout')
  },

  async requestPasswordReset(payload: PasswordRecoveryRequest) {
    return api.post('/auth/forgot-password', payload)
  },

  async resetPassword(payload: PasswordResetRequest) {
    return api.post('/auth/reset-password', payload)
  },
}
