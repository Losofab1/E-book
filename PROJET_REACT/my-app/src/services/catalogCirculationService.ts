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
  status: 'BORROWED' | 'RETURNED' | 'CANCELED'
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
  status: 'WAITING' | 'READY_FOR_PICKUP' | 'CANCELED' | 'EXPIRED' | 'PICKED_UP'
  reservedAt: string
  readyAt: string | null
  pickupDeadline: string | null
}

export const catalogCirculationService = {
  getDocuments() {
    return api.get<CatalogDocument[]>('/catalog-circulation/documents')
  },
  getPublicDocuments() {
    return api.get<CatalogDocument[]>('/public/catalogs')
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
  cancelLoan(id: number) {
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/loans/${id}/cancel`)
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
  pickupReservation(id: number) {
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/reservations/${id}/pickup`)
  },
  async download(id: number, fileName: string) {
    const blob = await catalogCirculationService.fetchFullBlob(id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  },
  getPublicAccess(id: number) {
    return api.get<{ fullAccess: boolean }>(`/public/catalogs/${id}/access`)
  },
  async fetchPreviewBlob(id: number) {
    const response = await api.get<Blob>(`/public/catalogs/${id}/preview`, { responseType: 'blob' })
    return response.data
  },
  async fetchFullBlob(id: number) {
    const response = await api.get<Blob>(`/catalogs/${id}/download`, { responseType: 'blob' })
    return response.data
  },
}