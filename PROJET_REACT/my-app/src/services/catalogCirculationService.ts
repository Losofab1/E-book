import { api } from './api'

export type CatalogDocument = {
  id: number
  name: string
  contentType: string
  available: boolean
  dueAt: string | null
  waitingReservations: number
}

export type CatalogDocumentLoan = {
  id: number
  userId: number
  userName: string
  catalogDocumentId: number
  catalogDocumentName: string
  contentType: string
  status: 'BORROWED' | 'RETURNED'
  borrowedAt: string
  dueAt: string
}

export type CatalogDocumentReservation = {
  id: number
  userId: number
  userName: string
  catalogDocumentId: number
  catalogDocumentName: string
  contentType: string
  status: 'WAITING' | 'READY_FOR_PICKUP' | 'CANCELED' | 'EXPIRED'
  reservedAt: string
  readyAt: string | null
  pickupDeadline: string | null
}

export const catalogCirculationService = {
  getDocuments() {
    return api.get<CatalogDocument[]>('/catalog-circulation/documents')
  },
  getLoans() {
    return api.get<CatalogDocumentLoan[]>('/catalog-circulation/loans')
  },
  createLoan(payload: { userId: number; catalogDocumentId: number }) {
    return api.post<CatalogDocumentLoan>('/catalog-circulation/loans', payload)
  },
  returnLoan(id: number) {
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/loans/${id}/return`)
  },
  extendLoan(id: number, dueAt: string) {
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/loans/${id}/extend`, { dueAt })
  },
  getReservations() {
    return api.get<CatalogDocumentReservation[]>('/catalog-circulation/reservations')
  },
  createReservation(payload: { userId: number; catalogDocumentId: number }) {
    return api.post<CatalogDocumentReservation>('/catalog-circulation/reservations', payload)
  },
  cancelReservation(id: number) {
    return api.patch<CatalogDocumentReservation>(`/catalog-circulation/reservations/${id}/cancel`)
  },
  markReservationReady(id: number) {
    return api.patch<CatalogDocumentReservation>(`/catalog-circulation/reservations/${id}/ready`)
  },
  async download(id: number, fileName: string) {
    const response = await api.get<Blob>(`/catalogs/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  },
}