import { api } from './api'
import type { DigitalAccess } from './types'

export const digitalAccessService = {
  getAccessStatus(bookId: number) {
    return api.get<DigitalAccess>(`/digital/books/${bookId}/access`)
  },
}
