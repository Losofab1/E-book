import { api } from './api'
import type { DigitalAccess } from './types'

export const digitalAccessService = {
  getAll() {
    return api.get<DigitalAccess[]>('/digital-access')
  },

  grant(payload: Partial<DigitalAccess>) {
    return api.post<DigitalAccess>('/digital-access/grant', payload)
  },

  revoke(id: string) {
    return api.delete(`/digital-access/${id}`)
  },
}
