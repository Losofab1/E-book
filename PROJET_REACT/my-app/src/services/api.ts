import axios from 'axios'

const rawBase = import.meta.env.VITE_API_BASE_URL || window.location.origin
const cleanBase = rawBase.trim().replace(/^\/+/, '').replace(/\/+$/, '')
const finalBase = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`

export const api = axios.create({
  baseURL: finalBase,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
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
      localStorage.removeItem('jwt_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)
