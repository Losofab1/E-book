import { api } from './api'
import type { Reservation } from './types'

export const reservationService = {
  getAll() {
    return api.get<Reservation[]>('/reservations')
  },

  create(payload: Partial<Reservation>) {
    return api.post<Reservation>('/reservations', payload)
  },

  cancel(id: string) {
    return api.patch<Reservation>(`/reservations/${id}/cancel`)
  },
}
