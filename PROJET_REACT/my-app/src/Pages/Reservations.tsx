import { ListChecks, CalendarCheck, Users, Trash2, Check, X } from 'lucide-react'
import { pushNotification } from '../notificationUtils'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { Link } from 'react-router-dom'
import ShowMoreButton from '../Components/ui/ShowMoreButton'

type UploadedCatalog = {
  id: string
  name: string
  type: string
  size: number
  file: Blob
  createdAt?: number
}

type Reservation = {
  id: string
  book: string
  userName: string
  userEmail: string
  position: number
  status: string
  pickupExpiresAt?: number
}

const STORAGE_KEY = 'losofab_reservations'

const getUploadedCatalogs = () => new Promise<UploadedCatalog[]>((resolve, reject) => {
  const request = indexedDB.open('losofab_catalog', 2)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('losofab_catalog_files')) {
      request.result.createObjectStore('losofab_catalog_files', { keyPath: 'id' })
    }
  }
  request.onsuccess = () => {
    const database = request.result
    if (!database.objectStoreNames.contains('losofab_catalog_files')) {
      resolve([])
      return
    }
    const filesRequest = database.transaction('losofab_catalog_files', 'readonly').objectStore('losofab_catalog_files').getAll()
    filesRequest.onsuccess = () => resolve(filesRequest.result as UploadedCatalog[])
    filesRequest.onerror = () => reject(filesRequest.error)
  }
  request.onerror = () => reject(request.error)
})

const Reservations = () => {
  const auth = useAuth()
  const role = auth.user?.role
  const isStaff = role === 'admin' || role === 'bibliothecaire'
  const isMember = role === 'etudiant' || role === 'professeur' || role === 'externe'
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [books, setBooks] = useState<string[]>([])
  const [selectedBook, setSelectedBook] = useState('')
  const [message, setMessage] = useState('')
  const [activeReservations, setActiveReservations] = useState(0)
  const [showAllReservations, setShowAllReservations] = useState(false)

  const approveReservation = (id: string) => {
    const pickupExpiresAt = Date.now() + 48 * 60 * 60 * 1000
    const next = reservations.map((r) =>
      r.id === id ? { ...r, status: 'Réservée', pickupExpiresAt } : r
    )
    setReservations(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // Trouver la réservation pour connaître le userEmail
    const approvedRes = reservations.find((r) => r.id === id)
    if (approvedRes) {
      pushNotification({
        type: 'reservation_approved',
        targetEmail: approvedRes.userEmail,
        message: `Votre réservation a été approuvée`,
        book: approvedRes.book,
        userName: approvedRes.userName,
        userEmail: approvedRes.userEmail,
      })
    }
    setMessage('Réservation approuvée : accès numérique actif pendant 48 heures.')
  }

  const rejectReservation = (id: string) => {
    const next = reservations.map((r) =>
      r.id === id ? { ...r, status: 'Rejetée' } : r
    )
    setReservations(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // Trouver la réservation pour connaître le userEmail
    const rejectedRes = reservations.find((r) => r.id === id)
    if (rejectedRes) {
      pushNotification({
        type: 'reservation_rejected',
        targetEmail: rejectedRes.userEmail,
        message: `Votre réservation a été rejetée`,
        book: rejectedRes.book,
        userName: rejectedRes.userName,
        userEmail: rejectedRes.userEmail,
      })
    }
    setMessage('Réservation rejetée.')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const stored: Reservation[] = raw ? JSON.parse(raw) : []
      const now = Date.now()
      const arr = stored.map((reservation) =>
        reservation.status === 'Réservée' && reservation.pickupExpiresAt && reservation.pickupExpiresAt <= now
          ? { ...reservation, status: 'Expirée' }
          : reservation
      )
      if (arr.some((reservation, index) => reservation.status !== stored[index]?.status)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
      }
      setReservations(arr)
      setActiveReservations(arr.filter((r) => r.status === 'En attente').length)
    } catch {
      setReservations([])
    }
    try {
      const rawBooks = localStorage.getItem('losofab_books')
      const arr: { title: string }[] = rawBooks ? JSON.parse(rawBooks) : []
      setBooks(arr.map((b: any) => b.title || b))
    } catch {
      setBooks([])
    }
    getUploadedCatalogs().then((catalogs) => {
      const importedNames = catalogs.map((catalog) => catalog.name)
      setBooks((current) => Array.from(new Set([...current, ...importedNames])))
    }).catch(() => undefined)
  }, [])

  const visible = isStaff ? reservations : reservations.filter((r) => r.userEmail === auth.user?.email)

  const createReservation = () => {
    if (!auth.user) return
    if (!selectedBook) {
      setMessage('Choisissez un ouvrage.')
      return
    }
    const newRes: Reservation = {
      id: String(Date.now()),
      book: selectedBook,
      userName: auth.user.name,
      userEmail: auth.user.email,
      position: 1, // Toujours en première position car on prepend
      status: 'En attente',
    }
    const next = [newRes, ...reservations]
    setReservations(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // Notifier le staff de la nouvelle réservation
    pushNotification({
      type: 'reservation_created',
      targetEmail: null,
      message: `${auth.user.name} a réservé un ouvrage`,
      book: selectedBook,
      userName: auth.user.name,
      userEmail: auth.user.email,
    })
    setMessage('Réservation créée.')
    setSelectedBook('')
  }

  const deleteReservation = (id: string) => {
    const next = reservations.filter((r) => r.id !== id)
    setReservations(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setMessage('Réservation supprimée.')
  }

  const createLoanFromReservation = (r: Reservation) => {
    const rawLoans = localStorage.getItem('losofab_loans')
    const loans = rawLoans ? JSON.parse(rawLoans) : []
    const newLoan = {
      id: String(Date.now()),
      userName: r.userName,
      userEmail: r.userEmail,
      book: r.book,
      due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    const nextLoans = [newLoan, ...loans]
    localStorage.setItem('losofab_loans', JSON.stringify(nextLoans))
    deleteReservation(r.id)
    setMessage('Prêt créé à partir de la réservation.')
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-gray-900">
      <div className="mb-8 rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
        <div>
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-green-700">Réservations</p>
            <h1 className="text-4xl font-bold">File d'attente des ouvrages</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Suivez les réservations et recevez les notifications lorsque vos ouvrages sont disponibles.</p>
          </div>
          {!auth.user ? (
            <Link to="/login" className="mt-8 inline-flex rounded-full bg-green-700 px-5 py-3 text-white transition hover:bg-green-800">
              Connectez-vous pour réserver
            </Link>
          ) : isMember ? (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-slate-50 p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Nouvelle réservation</p>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none"
                >
                  <option value="">Sélectionner un ouvrage...</option>
                  {books.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button onClick={createReservation} className="rounded-full bg-green-700 px-5 py-3 text-white transition hover:bg-green-800">
                  Créer une réservation
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
              Vous êtes connecté en tant que personnel.
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <ListChecks size={24} />
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Demandes en attente</p>
            <p className="mt-4 text-3xl font-semibold text-gray-900">{activeReservations}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <CalendarCheck size={24} />
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Disponibilités prévues</p>
            <p className="mt-4 text-3xl font-semibold text-gray-900">{reservations.filter((r) => r.status !== 'En attente').length}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <Users size={24} />
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Usagers en file</p>
            <p className="mt-4 text-3xl font-semibold text-gray-900">{new Set(reservations.map((r) => r.userEmail)).size}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold">{isStaff ? 'Toutes les réservations' : 'Vos réservations'}</h2>
        {message && <p className="mt-3 text-sm text-green-700 font-semibold">{message}</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Ouvrage</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Usager</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Aucune réservation active.</td>
                </tr>
              ) : (
                visible.slice(0, showAllReservations ? undefined : 10).map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{reservation.book}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{reservation.userName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{reservation.position}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${reservation.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' : ['Approuvée', 'Réservée'].includes(reservation.status) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        {isStaff ? (
                          <>
                            {reservation.status === 'En attente' && (
                              <>
                                <button onClick={() => approveReservation(reservation.id)} className="rounded-full bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700 flex items-center gap-1">
                                  <Check size={14} /> Approuver
                                </button>
                                <button onClick={() => rejectReservation(reservation.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 flex items-center gap-1">
                                  <X size={14} /> Rejeter
                                </button>
                              </>
                            )}
                            {['Approuvée', 'Réservée'].includes(reservation.status) && (
                              <>
                                <button onClick={() => createLoanFromReservation(reservation)} className="rounded-full bg-blue-600 px-3 py-1 text-white text-sm hover:bg-blue-700">
                                  Créer prêt
                                </button>
                              </>
                            )}
                            {reservation.status !== 'En attente' && !['Approuvée', 'Réservée'].includes(reservation.status) && (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                            <button onClick={() => deleteReservation(reservation.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 flex items-center gap-1">
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </>
                        ) : (
                          <>
                            {auth.user && auth.user.email === reservation.userEmail && (
                              <button onClick={() => deleteReservation(reservation.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 flex items-center gap-1">
                                <Trash2 size={14} /> Annuler
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {visible.length > 10 && (
            <ShowMoreButton showAll={showAllReservations} onToggle={() => setShowAllReservations((current) => !current)} />
          )}
        </div>

      </div>
    </section>
  )
}

export default Reservations

