import axios from 'axios'

const rawBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin)
const cleanBase = rawBase.trim().replace(/^\/+/, '').replace(/\/+$/, '')
const finalBase = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`

export const apiBaseUrl = finalBase

export const api = axios.create({
  baseURL: finalBase,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token')

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expirée : nettoie sans jamais casser la lecture publique.
      // Pas de reload forcé sur les pages publiques (/consulter, /, /login...).
      const hadToken = localStorage.getItem('jwt_token') !== null
      localStorage.removeItem('jwt_token')
      if (hadToken) {
        localStorage.removeItem('losofab_auth_user')
        const path = window.location.pathname ?? ''
        const isPublicPage = path === '/' || path === '/consulter' || path.startsWith('/login')
          || path.startsWith('/register') || path.startsWith('/forgot-password') || path.startsWith('/reset-password')
        if (!isPublicPage && !path.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)
