import { Link } from 'react-router-dom'
import { BellRing, BookOpenText, HandCoins, ListOrdered, X, CheckCircle, XCircle, RotateCcw, Menu } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { getNotificationsForUser, markNotificationRead, type AppNotification } from '../notificationUtils'
import ShowMoreButton from './ui/ShowMoreButton'

const NavBar = () => {
  const auth = useAuth()
  const user = auth.user
  const isStaff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasUnreadLoans, setHasUnreadLoans] = useState(false)
  const [hasUnreadReservations, setHasUnreadReservations] = useState(false)
  const [showAllLoanNotifications, setShowAllLoanNotifications] = useState(false)
  const [showAllReservationNotifications, setShowAllReservationNotifications] = useState(false)

  const refreshNotifications = async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); return }
    try {
    const allNotifs = await getNotificationsForUser()
    setNotifications(allNotifs)

    const unread = allNotifs.filter((notification) => !notification.read).length
    setUnreadCount(unread)

const unreadNotifs = allNotifs.filter((notification) => !notification.read)
    setHasUnreadLoans(unreadNotifs.some((n) => n.type.startsWith('loan') || n.type.startsWith('extension')))
    setHasUnreadReservations(unreadNotifs.some((n) => n.type.startsWith('reservation')))
    } catch { setNotifications([]); setUnreadCount(0) }
  }

  useEffect(() => {
    void refreshNotifications()
    const interval = setInterval(() => void refreshNotifications(), 15_000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const notice = sessionStorage.getItem('losofab_auth_notice')
    if (!notice) return

    sessionStorage.removeItem('losofab_auth_notice')
    setAuthNotice(notice)
    const timeout = window.setTimeout(() => setAuthNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [user])

  const markAsRead = () => {
    notifications.filter((notification) => !notification.read).forEach((notification) => void markNotificationRead(notification.id))
    setHasUnreadLoans(false)
    setHasUnreadReservations(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIconForType = (type: string) => {
    switch (type) {
      case 'loan_request': return <HandCoins size={16} />
      case 'loan_approved': return <CheckCircle size={16} />
      case 'loan_rejected': return <XCircle size={16} />
      case 'extension_request': return <RotateCcw size={16} />
      case 'extension_approved': return <CheckCircle size={16} />
      case 'extension_rejected': return <XCircle size={16} />
      case 'reservation_created': return <ListOrdered size={16} />
      case 'reservation_approved': return <CheckCircle size={16} />
      case 'reservation_rejected': return <XCircle size={16} />
      default: return <BellRing size={16} />
    }
  }

  const getBgColorForType = (type: string) => {
    if (type.includes('approved')) return 'bg-green-50'
    if (type.includes('rejected')) return 'bg-red-50'
    return 'bg-yellow-50'
  }

  const getIconBgForType = (type: string) => {
    if (type.includes('approved')) return 'bg-green-200 text-green-700'
    if (type.includes('rejected')) return 'bg-red-200 text-red-700'
    return 'bg-yellow-200 text-yellow-700'
  }

const getMessageForType = (type: string) => {
    switch (type) {
      case 'loan_request': return 'Demande de prêt en attente'
      case 'loan_approved': return 'Demande de prêt approuvée'
      case 'loan_rejected': return 'Demande de prêt rejetée'
      case 'extension_request': return 'Demande de prolongation en attente'
      case 'extension_approved': return 'Prolongation approuvée'
      case 'extension_rejected': return 'Prolongation rejetée'
      case 'reservation_created': return 'Nouvelle réservation en attente'
      case 'reservation_approved': return 'Réservation approuvée'
      case 'reservation_rejected': return 'Réservation rejetée'
      default: return 'Notification'
    }
  }

  const getLinkForType = (type: string): string => {
    if (type.startsWith('loan') || type.startsWith('extension')) return '/loans'
    if (type.startsWith('reservation')) return '/reservations'
    return '/'
  }

  const loanNotifs = notifications.filter((n) => n.type.startsWith('loan') || n.type.startsWith('extension'))
  const reservationNotifs = notifications.filter((n) => n.type.startsWith('reservation'))

  const closeMobileMenu = () => setShowMobileMenu(false)

  const confirmLogout = () => {
    if (!window.confirm('Voulez-vous vraiment vous déconnecter ?')) return

    auth.logout()
    closeMobileMenu()
  }

  const handleMobileNavClick = (event: ReactMouseEvent<HTMLElement>) => {
    const button = (event.target as HTMLElement).closest('button')
    if (!button?.textContent?.trim().toLowerCase().includes('connexion')) return

    event.preventDefault()
    event.stopPropagation()
    confirmLogout()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-green-700/95 px-3 py-3 shadow-lg backdrop-blur-sm sm:px-4 sm:py-4">
      {authNotice && (
        <div role="status" className="fixed right-4 top-24 z-[60] rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-800 shadow-xl">
          {authNotice}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link to="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-2 text-xl font-black text-white sm:gap-3 sm:text-2xl">
          <BookOpenText size={34} strokeWidth={1} className="shrink-0 sm:h-[42px] sm:w-[42px]" />
          <span className="truncate">LOSO<span className="text-yellow-400">FAB</span></span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 text-sm font-semibold text-white lg:flex lg:gap-2 lg:text-base">
          <Link to="/" className="rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">Accueil</Link>
          <Link to="/consulter" className="rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">Catalogue</Link>
          <Link to="/loans" className="relative rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">
            Prêts
            {hasUnreadLoans && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-green-900">
                !
              </span>
            )}
          </Link>
          <Link to="/reservations" className="relative rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">
            Réservations
            {hasUnreadReservations && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-green-900">
                !
              </span>
            )}
          </Link>
          {isStaff && (
            <>
              <Link to="/dashboard" className="rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">Dashboard</Link>
              <Link to="/catalog" className="rounded-lg px-2 py-2 transition hover:bg-white/20 lg:px-3">Gestion catalogue</Link>
            </>
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <span className="rounded-full bg-white/10 px-3 py-2 text-sm text-white">{user.name}</span>
              <Link to="/profile" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20">Espace privé</Link>
              <button
                onClick={confirmLogout}
                className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-green-900 transition hover:bg-yellow-300"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20">Connexion</Link>
              <Link to="/register" className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-green-900 transition hover:bg-yellow-300">Inscription</Link>
            </>
          )}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                if (!showNotifications) markAsRead()
              }}
              className="relative rounded-lg p-2 transition hover:bg-white/10"
            >
              <BellRing className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 rounded-3xl border border-gray-200 bg-white shadow-2xl text-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="text-lg font-bold">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto p-4">
                  {loanNotifs.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                        <HandCoins size={16} />
                        Prêts ({loanNotifs.length})
                        {hasUnreadLoans && <span className="ml-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-green-900">NOUVEAU</span>}
                      </h4>
                      <div className="space-y-2">
                        {loanNotifs.slice(0, showAllLoanNotifications ? undefined : 10).map((item) => (
                          <Link
                            key={item.id}
                            to={getLinkForType(item.type)}
                            onClick={() => setShowNotifications(false)}
                            className={`flex items-start gap-3 rounded-2xl p-3 text-sm transition hover:opacity-80 ${getBgColorForType(item.type)}`}
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getIconBgForType(item.type)}`}>
                              {getIconForType(item.type)}
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold ${item.type.includes('approved') ? 'text-green-900' : item.type.includes('rejected') ? 'text-red-900' : 'text-yellow-900'}`}>
                                {item.message}
                              </p>
                              <p className={item.type.includes('approved') ? 'text-green-700' : item.type.includes('rejected') ? 'text-red-700' : 'text-yellow-700'}>
                                "{item.book}"
                              </p>
                              <p className={`text-xs ${item.type.includes('approved') ? 'text-green-600' : item.type.includes('rejected') ? 'text-red-600' : 'text-yellow-600'}`}>
                                {getMessageForType(item.type)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      {loanNotifs.length > 10 && (
                        <ShowMoreButton
                          showAll={showAllLoanNotifications}
                          onToggle={() => setShowAllLoanNotifications((current) => !current)}
                        />
                      )}
                    </div>
                  )}

                  {reservationNotifs.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                        <ListOrdered size={16} />
                        Réservations ({reservationNotifs.length})
                        {hasUnreadReservations && <span className="ml-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-green-900">NOUVEAU</span>}
                      </h4>
                      <div className="space-y-2">
                        {reservationNotifs.slice(0, showAllReservationNotifications ? undefined : 10).map((item) => (
                          <Link
                            key={item.id}
                            to={getLinkForType(item.type)}
                            onClick={() => setShowNotifications(false)}
                            className={`flex items-start gap-3 rounded-2xl p-3 text-sm transition hover:opacity-80 ${getBgColorForType(item.type)}`}
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getIconBgForType(item.type)}`}>
                              {getIconForType(item.type)}
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold ${item.type.includes('approved') ? 'text-green-900' : item.type.includes('rejected') ? 'text-red-900' : 'text-yellow-900'}`}>
                                {item.message}
                              </p>
                              <p className={item.type.includes('approved') ? 'text-green-700' : item.type.includes('rejected') ? 'text-red-700' : 'text-yellow-700'}>
                                "{item.book}"
                              </p>
                              <p className={`text-xs ${item.type.includes('approved') ? 'text-green-600' : item.type.includes('rejected') ? 'text-red-600' : 'text-yellow-600'}`}>
                                {getMessageForType(item.type)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      {reservationNotifs.length > 10 && (
                        <ShowMoreButton
                          showAll={showAllReservationNotifications}
                          onToggle={() => setShowAllReservationNotifications((current) => !current)}
                        />
                      )}
                    </div>
                  )}

                  {notifications.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      <BellRing size={36} className="mx-auto mb-3 text-gray-300" />
                      <p className="font-semibold">Aucune notification</p>
                      <p className="text-sm">Tout est à jour.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications)
                if (!showNotifications) markAsRead()
              }}
              aria-label="Ouvrir les notifications"
              className="relative rounded-lg p-2 text-white transition hover:bg-white/10"
            >
              <BellRing size={22} />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount}</span>}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileMenu((current) => !current)}
            aria-label={showMobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={showMobileMenu}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
          >
            {showMobileMenu ? <X size={25} /> : <Menu size={25} />}
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <div className="mx-auto mt-3 max-w-7xl border-t border-white/20 pt-3 lg:hidden">
          <nav onClickCapture={handleMobileNavClick} className="grid gap-1 text-sm font-semibold text-white">
            <Link to="/" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Accueil</Link>
            <Link to="/consulter" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Catalogue</Link>
            <Link to="/loans" onClick={closeMobileMenu} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-white/15">Prêts {hasUnreadLoans && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs text-green-900">Nouveau</span>}</Link>
            <Link to="/reservations" onClick={closeMobileMenu} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-white/15">Réservations {hasUnreadReservations && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs text-green-900">Nouveau</span>}</Link>
            {isStaff && <>
              <Link to="/dashboard" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Dashboard</Link>
              <Link to="/catalog" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Gestion catalogue</Link>
            </>}
            {user ? <>
              <Link to="/profile" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Espace privé · {user.name}</Link>
              <button type="button" onClick={() => { auth.logout(); closeMobileMenu() }} className="rounded-lg bg-yellow-400 px-3 py-3 text-left font-semibold text-green-900">Déconnexion</button>
            </> : <>
              <Link to="/login" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 hover:bg-white/15">Connexion</Link>
              <Link to="/register" onClick={closeMobileMenu} className="rounded-lg bg-yellow-400 px-3 py-3 font-semibold text-green-900">Inscription</Link>
            </>}
          </nav>
        </div>
      )}
    </header>
  )
}

export default NavBar
