const sameResource = (storedName: string, documentName: string) => {
  const normalize = (value: string) => value.toLowerCase().replace(/\.(pdf|csv)$/i, '').replace(/[^a-z0-9]/g, '')
  const stored = normalize(storedName)
  const document = normalize(documentName)
  return stored === document || stored.includes(document) || document.includes(stored)
}
export type DigitalAccess = {
  level: 'preview' | 'full'
  reason: 'visitor' | 'loan' | 'reservation' | 'staff' | 'expired'
  expiresAt?: number
}

type Loan = {
  userEmail: string
  book: string
  due: string
}

type Reservation = {
  userEmail: string
  book: string
  status: string
  pickupExpiresAt?: number
}

const readList = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const endOfDay = (date: string) => {
  const value = new Date(`${date}T23:59:59`)
  return Number.isNaN(value.getTime()) ? 0 : value.getTime()
}

export function getDigitalAccess(userEmail: string | undefined, bookName: string, role?: string): DigitalAccess {
  if (!userEmail) return { level: 'preview', reason: 'visitor' }

  if (role === 'admin' || role === 'bibliothecaire') {
    return { level: 'full', reason: 'staff' }
  }

  const now = Date.now()
  const loan = readList<Loan>('losofab_loans').find(
    (item) => item.userEmail.toLowerCase() === userEmail.toLowerCase() && sameResource(item.book, bookName)
  )
  if (loan) {
    const expiresAt = endOfDay(loan.due)
    if (expiresAt > now) return { level: 'full', reason: 'loan', expiresAt }
  }

  const reservation = readList<Reservation>('losofab_reservations').find(
    (item) => item.userEmail.toLowerCase() === userEmail.toLowerCase() &&
      sameResource(item.book, bookName) &&
      ['Approuvée', 'Réservée'].includes(item.status)
  )
  if (reservation?.pickupExpiresAt && reservation.pickupExpiresAt > now) {
    return { level: 'full', reason: 'reservation', expiresAt: reservation.pickupExpiresAt }
  }

  return { level: 'preview', reason: loan || reservation ? 'expired' : 'visitor' }
}

export function formatAccessExpiry(expiresAt?: number) {
  if (!expiresAt) return ''
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(expiresAt)
}
