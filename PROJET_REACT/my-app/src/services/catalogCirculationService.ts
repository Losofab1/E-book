import { api } from './api'

export type CatalogDocument = {
  id: number
  name: string
  contentType: string
  available: boolean
  dueAt: string | null
  waitingReservations: number
  totalCopies: number
  availableCopies: number
  borrowedCount: number
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

const DOC_CACHE_TTL = 30 * 1000

let docCache: { staff: CatalogDocument[] | null; pub: CatalogDocument[] | null; atStaff: number; atPub: number } = {
  staff: null,
  pub: null,
  atStaff: 0,
  atPub: 0,
}
let staffPending: Promise<CatalogDocument[]> | null = null
let pubPending: Promise<CatalogDocument[]> | null = null

export const clearCatalogCache = () => {
  docCache = { staff: null, pub: null, atStaff: 0, atPub: 0 }
  staffPending = null
  pubPending = null
}

async function fetchStaffDocuments(): Promise<CatalogDocument[]> {
  if (docCache.staff && Date.now() - docCache.atStaff < DOC_CACHE_TTL) return docCache.staff
  if (!staffPending) {
    staffPending = api.get<CatalogDocument[]>('/catalog-circulation/documents').then((r) => {
      docCache = { ...docCache, staff: r.data, atStaff: Date.now() }
      return r.data
    }).finally(() => { staffPending = null })
  }
  return staffPending
}

async function fetchPublicDocuments(): Promise<CatalogDocument[]> {
  if (docCache.pub && Date.now() - docCache.atPub < DOC_CACHE_TTL) return docCache.pub
  if (!pubPending) {
    pubPending = api.get<CatalogDocument[]>('/public/catalogs').then((r) => {
      docCache = { ...docCache, pub: r.data, atPub: Date.now() }
      return r.data
    }).finally(() => { pubPending = null })
  }
  return pubPending
}

export const catalogCirculationService = {
  getDocuments() {
    return fetchStaffDocuments().then((data) => ({ data }) as { data: CatalogDocument[] })
  },
  getPublicDocuments() {
    return fetchPublicDocuments().then((data) => ({ data }) as { data: CatalogDocument[] })
  },
  getLoans() {
    return api.get<CatalogDocumentLoan[]>('/catalog-circulation/loans')
  },
  createLoan(payload: { userId: number; catalogDocumentId: number }) {
    clearCatalogCache()
    return api.post<CatalogDocumentLoan>('/catalog-circulation/loans', payload).finally(() => clearCatalogCache())
  },
  returnLoan(id: number) {
    clearCatalogCache()
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/loans/${id}/return`).finally(() => clearCatalogCache())
  },
  cancelLoan(id: number) {
    clearCatalogCache()
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/loans/${id}/cancel`).finally(() => clearCatalogCache())
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
    clearCatalogCache()
    return api.patch<CatalogDocumentLoan>(`/catalog-circulation/reservations/${id}/pickup`).finally(() => clearCatalogCache())
  },
  async download(id: number, fileName: string) {
    const blob = await catalogCirculationService.fetchFullBlob(id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  getPublicAccess(id: number) {
    return api.get<{ fullAccess: boolean }>(`/public/catalogs/${id}/access`)
  },
  async fetchPreviewBlob(id: number) {
    const response = await api.get<Blob>(`/public/catalogs/${id}/preview`, { responseType: 'blob' })
    return response.data
  },
  async fetchFullBlob(id: number) {
    try {
      const response = await api.get<Blob>(`/catalogs/${id}/content`, { responseType: 'blob' })
      return response.data
    } catch (error: any) {
      // /content exige un prêt actif (403 sans emprunt). Le personnel dispose
      // de /download : repli sur 403 comme sur 404 pour le téléchargement staff.
      if (error?.response?.status === 404 || error?.response?.status === 403) {
        const fallback = await api.get<Blob>(`/catalogs/${id}/download`, { responseType: 'blob' })
        return fallback.data
      }
      throw error
    }
  },
}