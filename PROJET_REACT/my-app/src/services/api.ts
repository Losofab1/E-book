import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const API_BASE_URL = `${configuredBaseUrl.replace(/\/+$/, '')}${configuredBaseUrl.replace(/\/+$/, '').endsWith('/api') ? '' : '/api'}`

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token')

    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
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
