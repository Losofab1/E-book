import { api } from './api'
import type { Reservation } from './types'

export const reservationService = {
  getAll() {
    return api.get<Reservation[]>('/digital/reservations')
  },

  create(payload: Partial<Reservation>) {
    return api.post<Reservation>('/digital/reservations', payload)
  },

  cancel(id: string) {
    return api.patch<Reservation>(`/digital/reservations/${id}/cancel`)
  },

  ready(id: number) {
    return api.patch(`/digital/reservations/${id}/ready`)
  },
}
