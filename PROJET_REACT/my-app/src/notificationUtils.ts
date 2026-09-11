const NOTIFICATIONS_KEY = 'losofab_notifications_queue'

export interface AppNotification {
  id: string
  type: 'loan_request' | 'loan_approved' | 'loan_rejected' | 'reservation_created' | 'reservation_approved' | 'reservation_rejected' | 'extension_request' | 'extension_approved' | 'extension_rejected'
  targetEmail: string | null        // null = pour tout le staff
  targetRole?: 'admin' | 'bibliothecaire' | 'etudiant' | 'professeur' | 'externe'
  message: string
  book: string
  userName: string
  userEmail: string
  createdAt: number
}

export function pushNotification(notif: Omit<AppNotification, 'id' | 'createdAt'>) {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    const list: AppNotification[] = raw ? JSON.parse(raw) : []
    const newNotif: AppNotification = {
      ...notif,
      id: String(Date.now() + Math.random()),
      createdAt: Date.now(),
    }
    list.unshift(newNotif)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function getNotificationsForUser(email: string | undefined, role: string | undefined): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    const list: AppNotification[] = raw ? JSON.parse(raw) : []
    
    return list.filter((n) => {
      // Si la notification cible un email spécifique
      if (n.targetEmail && email) {
        return n.targetEmail.toLowerCase() === email.toLowerCase()
      }
      // Si la notification cible le staff (targetEmail === null) et l'utilisateur est staff
      if (n.targetEmail === null && (role === 'admin' || role === 'bibliothecaire')) {
        return true
      }
      return false
    })
  } catch {
    return []
  }
}

export function getUnreadCount(email: string | undefined, role: string | undefined): number {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    const list: AppNotification[] = raw ? JSON.parse(raw) : []
    const lastReadStr = localStorage.getItem('losofab_notifications_last_read')
    const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0
    
    return list.filter((n) => {
      if (n.targetEmail && email) {
        return n.targetEmail.toLowerCase() === email.toLowerCase() && n.createdAt > lastRead
      }
      if (n.targetEmail === null && (role === 'admin' || role === 'bibliothecaire')) {
        return n.createdAt > lastRead
      }
      return false
    }).length
  } catch {
    return 0
  }
}
