import { RotateCcw, CheckCircle2, Clock3, Trash2, Check, SendHorizonal } from "lucide-react"
import { pushNotification } from '../notificationUtils'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import ShowMoreButton from '../Components/ui/ShowMoreButton'

type Loan = {
  id: string
  userName: string
  userEmail: string
  book: string
  due: string
  extensions: number // nombre de prolongations déjà approuvées (max 3)
}

type LoanRequest = {
  id: string
  userName: string
  userEmail: string
  book: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
}

type ExtensionRequest = {
  id: string
  loanId: string
  userName: string
  userEmail: string
  book: string
  currentDue: string
  newDue: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  extensionCount: number
}

type Book = {
  title: string
  author: string
  isbn: string
  category?: string
}

type UploadedCatalog = {
  id: string
  name: string
  type: string
  size: number
  file: Blob
  createdAt?: number
}

const STORAGE_KEY = 'losofab_loans'
const REQUESTS_KEY = 'losofab_loan_requests'
const EXTENSION_REQUESTS_KEY = 'losofab_extension_requests'
const MAX_EXTENSIONS = 3

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
    const requestFiles = database.transaction('losofab_catalog_files', 'readonly').objectStore('losofab_catalog_files').getAll()
    requestFiles.onsuccess = () => resolve(requestFiles.result as UploadedCatalog[])
    requestFiles.onerror = () => reject(requestFiles.error)
  }
  request.onerror = () => reject(request.error)
})

const Loans = () => {
  const auth = useAuth()
  const role = auth.user?.role
  const isAdmin = role === 'admin'
  const isStaff = role === 'admin' || role === 'bibliothecaire'
  const isMember = role === 'etudiant' || role === 'professeur' || role === 'externe'
  const [loans, setLoans] = useState<Loan[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([])
  const [users, setUsers] = useState<{ name: string; email: string }[]>([])
  const [books, setBooks] = useState<string[]>([])
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [uploadedCatalogs, setUploadedCatalogs] = useState<UploadedCatalog[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])
  const [due, setDue] = useState('')
  const [message, setMessage] = useState('')
  const [returnedCount, setReturnedCount] = useState(0)
  const [extendedCount, setExtendedCount] = useState(0)
  const [showAllBooks, setShowAllBooks] = useState(false)
  const [showAllLoans, setShowAllLoans] = useState(false)
  const [showAllPendingExtensions, setShowAllPendingExtensions] = useState(false)
  const [showAllExtensionHistory, setShowAllExtensionHistory] = useState(false)
  const [showAllLoanRequests, setShowAllLoanRequests] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const arr: Loan[] = raw ? JSON.parse(raw) : []
      setLoans(arr)
    } catch { setLoans([]) }
    try {
      const rawReturned = localStorage.getItem('losofab_returned_loans')
      const arr: string[] = rawReturned ? JSON.parse(rawReturned) : []
      setReturnedCount(arr.length)
    } catch { setReturnedCount(0) }
    try {
      const rawExtended = localStorage.getItem('losofab_extended_loans')
      const arr: string[] = rawExtended ? JSON.parse(rawExtended) : []
      setExtendedCount(arr.length)
    } catch { setExtendedCount(0) }
    try {
      const raw = localStorage.getItem(REQUESTS_KEY)
      const arr: LoanRequest[] = raw ? JSON.parse(raw) : []
      setLoanRequests(arr)
    } catch { setLoanRequests([]) }
    try {
      const raw = localStorage.getItem(EXTENSION_REQUESTS_KEY)
      const arr: ExtensionRequest[] = raw ? JSON.parse(raw) : []
      setExtensionRequests(arr)
    } catch { setExtensionRequests([]) }
    try {
      const rawUsers = localStorage.getItem('losofab_users')
      const arr = rawUsers ? JSON.parse(rawUsers) : []
      setUsers(arr.map((u: any) => ({ name: u.name, email: u.email })))
    } catch { setUsers([]) }
    try {
      const rawBooks = localStorage.getItem('losofab_books')
      const arr: Book[] = rawBooks ? JSON.parse(rawBooks) : []
      setAllBooks(arr)
      setBooks(arr.map((b: any) => b.title || b))
    } catch { setBooks([]); setAllBooks([]) }

    getUploadedCatalogs().then((catalogs) => {
      setUploadedCatalogs(catalogs.sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0)))
      const importedNames = catalogs.map((catalog) => catalog.name)
      setBooks((current) => Array.from(new Set([...current, ...importedNames])))
    }).catch(() => setUploadedCatalogs([]))
  }, [])

  const visibleLoans = isStaff ? loans : loans.filter((l) => l.userEmail === auth.user?.email)
  const visibleLoanRequests = isStaff ? loanRequests : loanRequests.filter((r) => r.userEmail === auth.user?.email)
  const visibleExtensionRequests = isStaff ? extensionRequests : extensionRequests.filter((r) => r.userEmail === auth.user?.email)

  // ========== CRUD LOANS ==========

  const createLoan = () => {
    if (!isAdmin) return
    if (!selectedUser || !selectedBook || !due) {
      setMessage('Remplissez tous les champs.')
      return
    }
    const user = users.find((u) => u.email === selectedUser)
    const newLoan: Loan = {
      id: String(Date.now()),
      userName: user?.name || selectedUser,
      userEmail: selectedUser,
      book: selectedBook,
      due,
      extensions: 0,
    }
    const next = [newLoan, ...loans]
    setLoans(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setMessage('Prêt enregistré.')
    setSelectedUser('')
    setSelectedBook('')
    setDue('')
  }

  const deleteLoan = (id: string) => {
    const next = loans.filter((l) => l.id !== id)
    setLoans(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setMessage('Prêt supprimé.')
  }

  const returnLoan = (id: string) => {
    const loan = loans.find((l) => l.id === id)
    if (!loan) return
    const rawReturned = localStorage.getItem('losofab_returned_loans')
    const returned: string[] = rawReturned ? JSON.parse(rawReturned) : []
    returned.push(loan.id)
    localStorage.setItem('losofab_returned_loans', JSON.stringify(returned))
    setReturnedCount(returned.length)
    deleteLoan(id)
    setMessage('Prêt retourné avec succès.')
  }

  // ========== EXTENSION WORKFLOW ==========

  // MEMBRE : demande une prolongation (max 3)
  const requestExtension = (loan: Loan) => {
    if (!isMember) return
    if (loan.extensions >= MAX_EXTENSIONS) {
      setMessage(`Vous avez atteint le nombre maximum de ${MAX_EXTENSIONS} prolongations pour cet ouvrage.`)
      return
    }

    const currentDue = new Date(loan.due)
    const newDue = new Date(currentDue.getTime() + 14 * 24 * 60 * 60 * 1000)

    const newReq: ExtensionRequest = {
      id: String(Date.now() + Math.random()),
      loanId: loan.id,
      userName: loan.userName,
      userEmail: loan.userEmail,
      book: loan.book,
      currentDue: loan.due,
      newDue: newDue.toISOString().slice(0, 10),
      requestDate: new Date().toISOString().slice(0, 10),
      status: 'pending',
      extensionCount: loan.extensions + 1,
    }

    const next = [newReq, ...extensionRequests]
    setExtensionRequests(next)
    localStorage.setItem(EXTENSION_REQUESTS_KEY, JSON.stringify(next))

    // Notifier le staff
    pushNotification({
      type: 'extension_request',
      targetEmail: null,
      message: `${loan.userName} demande une prolongation (${loan.extensions + 1}/${MAX_EXTENSIONS})`,
      book: loan.book,
      userName: loan.userName,
      userEmail: loan.userEmail,
    })

    setMessage('Demande de prolongation envoyée au personnel pour approbation.')
  }

  // STAFF : approuve une demande de prolongation
  const approveExtension = (req: ExtensionRequest) => {
    // Mettre à jour le prêt : ajouter 14 jours et incrémenter le compteur
    const updatedLoans = loans.map((loan) => {
      if (loan.id === req.loanId) {
        const currentDue = new Date(loan.due)
        const newDue = new Date(currentDue.getTime() + 14 * 24 * 60 * 60 * 1000)
        return {
          ...loan,
          due: newDue.toISOString().slice(0, 10),
          extensions: (loan.extensions || 0) + 1,
        }
      }
      return loan
    })
    setLoans(updatedLoans)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLoans))

    // Marquer la demande comme approuvée
    const updatedReqs = extensionRequests.map((r) =>
      r.id === req.id ? { ...r, status: 'approved' as const } : r
    )
    setExtensionRequests(updatedReqs)
    localStorage.setItem(EXTENSION_REQUESTS_KEY, JSON.stringify(updatedReqs))

    // Tracker la prolongation
    const rawExtended = localStorage.getItem('losofab_extended_loans')
    const extended: string[] = rawExtended ? JSON.parse(rawExtended) : []
    extended.push(req.loanId)
    localStorage.setItem('losofab_extended_loans', JSON.stringify(extended))
    setExtendedCount(extended.length)

    // Notifier le membre
    pushNotification({
      type: 'extension_approved',
      targetEmail: req.userEmail,
      message: `Votre demande de prolongation a été approuvée (${req.extensionCount}/${MAX_EXTENSIONS})`,
      book: req.book,
      userName: req.userName,
      userEmail: req.userEmail,
    })

    setMessage('Prolongation approuvée. Le prêt a été prolongé de 14 jours.')
  }

  // STAFF : rejette une demande de prolongation
  const rejectExtension = (reqId: string) => {
    const updatedReqs = extensionRequests.map((r) =>
      r.id === reqId ? { ...r, status: 'rejected' as const } : r
    )
    setExtensionRequests(updatedReqs)
    localStorage.setItem(EXTENSION_REQUESTS_KEY, JSON.stringify(updatedReqs))

    const req = extensionRequests.find((r) => r.id === reqId)
    if (req) {
      pushNotification({
        type: 'extension_rejected',
        targetEmail: req.userEmail,
        message: `Votre demande de prolongation a été rejetée`,
        book: req.book,
        userName: req.userName,
        userEmail: req.userEmail,
      })
    }

    setMessage('Demande de prolongation rejetée.')
  }

  // ========== LOAN REQUESTS ==========

  const cancelLoanRequest = (id: string) => {
    const next = loanRequests.filter((r) => r.id !== id)
    setLoanRequests(next)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(next))
    setMessage('Demande annulée.')
  }

  const approveLoanRequest = (request: LoanRequest) => {
    const newLoan: Loan = {
      id: String(Date.now()),
      userName: request.userName,
      userEmail: request.userEmail,
      book: request.book,
      due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      extensions: 0,
    }
    const nextLoans = [newLoan, ...loans]
    setLoans(nextLoans)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLoans))
    const updatedRequest = { ...request, status: 'approved' as const }
    const nextRequests = loanRequests.map((r) => (r.id === request.id ? updatedRequest : r))
    setLoanRequests(nextRequests)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(nextRequests))
    setMessage('Prêt approuvé et créé.')
    pushNotification({
      type: 'loan_approved',
      targetEmail: request.userEmail,
      message: `Votre demande de prêt a été approuvée`,
      book: request.book,
      userName: request.userName,
      userEmail: request.userEmail,
    })
  }

  const rejectLoanRequest = (id: string) => {
    const found = loanRequests.find((r) => r.id === id)
    if (!found) return
    const updatedRequest = { ...found, status: 'rejected' as const }
    const nextRequests = loanRequests.map((r) => (r.id === id ? updatedRequest : r))
    setLoanRequests(nextRequests)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(nextRequests))
    setMessage('Demande rejetée.')
    pushNotification({
      type: 'loan_rejected',
      targetEmail: found.userEmail,
      message: `Votre demande de prêt a été rejetée`,
      book: found.book,
      userName: found.userName,
      userEmail: found.userEmail,
    })
  }

  const toggleBook = (book: string) => {
    setSelectedBooks((prev) =>
      prev.includes(book) ? prev.filter((b) => b !== book) : [...prev, book]
    )
  }

  const requestMultipleLoans = () => {
    if (!auth.user) return
    if (selectedBooks.length === 0) {
      setMessage('Sélectionnez au moins un ouvrage.')
      return
    }
    const newRequests = selectedBooks.map((book) => ({
      id: String(Date.now() + Math.random()),
      userName: auth.user!.name,
      userEmail: auth.user!.email,
      book,
      requestDate: new Date().toISOString().slice(0, 10),
      status: 'pending' as const,
    }))
    const next = [...newRequests, ...loanRequests]
    setLoanRequests(next)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(next))
    newRequests.forEach((req) => {
      pushNotification({
        type: 'loan_request',
        targetEmail: null,
        message: `${auth.user!.name} a demandé un prêt`,
        book: req.book,
        userName: auth.user!.name,
        userEmail: auth.user!.email,
      })
    })
    setMessage(`${selectedBooks.length} demande(s) de prêt envoyée(s).`)
    setSelectedBooks([])
  }

  // ========== RENDER ==========

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-gray-900">
      <div className="mb-8 rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
        <div>
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-green-700">Gestion des prêts</p>
            <h1 className="text-4xl font-bold">Prêts et retours</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Enregistrez rapidement les sorties, les retours et suivez les retards en temps réel.</p>
          </div>
          {isAdmin && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-slate-50 p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Enregistrer un emprunt</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-center">
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none">
                  <option value="">Sélectionner un usager...</option>
                  {users.map((u) => (
                    <option key={u.email} value={u.email}>{u.name} — {u.email}</option>
                  ))}
                </select>
                <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none">
                  <option value="">Sélectionner un ouvrage...</option>
                  {books.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none" />
                <button onClick={createLoan} className="rounded-full bg-green-700 px-5 py-3 text-white transition hover:bg-green-800">Nouvel emprunt</button>
              </div>
            </div>
          )}
        </div>

        {message && <div className="mb-6 max-w-7xl mx-auto text-green-700 font-semibold">{message}</div>}

        {uploadedCatalogs.length > 0 && (
          <div className="mb-8 rounded-3xl border border-green-200 bg-green-50 p-6 shadow-md">
            <h2 className="text-xl font-bold text-green-900">Catalogues disponibles pour les prêts</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uploadedCatalogs.map((catalog) => (
                <div key={catalog.id} className="rounded-2xl border border-green-100 bg-white p-4">
                  <p className="truncate font-semibold text-gray-900">{catalog.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                    {catalog.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'CSV'} · Catalogue importé
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demande de prêt - Membres */}
        {isMember && auth.user && (
          <div className="mb-8 rounded-3xl bg-blue-50 border border-blue-200 p-8 shadow-md">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Demander un prêt</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sélectionner un ou plusieurs ouvrages</label>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg bg-white p-4">
                  {books.length === 0 ? (
                    <p className="text-gray-500">Aucun ouvrage disponible</p>
                  ) : (
                    books.slice(0, showAllBooks ? undefined : 10).map((book) => (
                      <label key={book} className="flex items-center gap-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBooks.includes(book)}
                          onChange={() => toggleBook(book)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">{book}</span>
                      </label>
                    ))
                  )}
                </div>
                {books.length > 10 && (
                  <ShowMoreButton showAll={showAllBooks} onToggle={() => setShowAllBooks((current) => !current)} />
                )}
                <p className="text-sm text-gray-600 mt-2">{selectedBooks.length} ouvrage(s) sélectionné(s)</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={requestMultipleLoans} className="rounded-full bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
                  Demander les prêts
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { icon: Clock3, label: "Prêts en cours", value: String(visibleLoans.length) },
            { icon: CheckCircle2, label: "Retours effectués", value: String(returnedCount) },
            { icon: RotateCcw, label: "Prolongations", value: String(extendedCount) },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                  <Icon size={24} />
                </div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{stat.label}</p>
                <p className="mt-4 text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Tableau des prêts */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="px-6 py-6 sm:px-8">
            <h2 className="text-2xl font-semibold">{isStaff ? 'Tous les emprunts' : 'Vos emprunts'}</h2>
            <p className="mt-2 text-sm text-gray-600">{isStaff ? 'Liste de tous les prêts de la bibliothèque.' : 'Liste des prêts qui vous concernent.'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Usager</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Ouvrage</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Retour prévu</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prolong.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {auth.user ? 'Aucun emprunt en cours.' : 'Connectez-vous pour consulter vos emprunts.'}
                    </td>
                  </tr>
                ) : (
                  visibleLoans.slice(0, showAllLoans ? undefined : 10).map((loan) => {
                    const extCount = loan.extensions || 0
                    const canExtend = extCount < MAX_EXTENSIONS
                    const hasPendingExtReq = extensionRequests.some(
                      (r) => r.loanId === loan.id && r.status === 'pending'
                    )
                    return (
                      <tr key={loan.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{loan.userName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{loan.book}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{loan.due}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{extCount}/{MAX_EXTENSIONS}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex gap-2">
                            {isStaff ? (
                              <>
                                <button onClick={() => returnLoan(loan.id)} className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700">Retour</button>
                              </>
                            ) : isMember ? (
                              <>
                                {canExtend && !hasPendingExtReq && (
                                  <button onClick={() => requestExtension(loan)} className="rounded-full bg-green-700 px-4 py-2 text-sm text-white transition hover:bg-green-800 flex items-center gap-1">
                                    <SendHorizonal size={14} /> Prolonger
                                  </button>
                                )}
                                {hasPendingExtReq && (
                                  <span className="inline-flex px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">En attente</span>
                                )}
                                {!canExtend && !hasPendingExtReq && (
                                  <span className="text-xs text-gray-500 italic">Max atteint</span>
                                )}
                                <button onClick={() => returnLoan(loan.id)} className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700">Retour</button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-gray-400 italic">Admin</span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {visibleLoans.length > 10 && (
            <ShowMoreButton showAll={showAllLoans} onToggle={() => setShowAllLoans((current) => !current)} />
          )}
        </div>

        {/* Demandes de prolongation - uniquement pour le staff */}
        {isStaff && visibleExtensionRequests.filter((r) => r.status === 'pending').length > 0 && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="px-6 py-6 sm:px-8 bg-amber-50">
              <h2 className="text-2xl font-semibold text-amber-900">Demandes de prolongation à approuver</h2>
              <p className="mt-2 text-sm text-amber-700">
                Les membres demandent une prolongation de leurs prêts. Approuvez ou rejetez ces demandes.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Usager</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Ouvrage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Date actuelle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nouvelle date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prolong.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {visibleExtensionRequests.filter((r) => r.status === 'pending').slice(0, showAllPendingExtensions ? undefined : 10).map((req) => (
                    <tr key={req.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{req.userName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.book}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.currentDue}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-700">{req.newDue}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.extensionCount}/{MAX_EXTENSIONS}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => approveExtension(req)} className="rounded-full bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700 flex items-center gap-1">
                            <Check size={14} /> Approuver
                          </button>
                          <button onClick={() => rejectExtension(req.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700">
                            Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleExtensionRequests.filter((r) => r.status === 'pending').length > 10 && (
              <ShowMoreButton showAll={showAllPendingExtensions} onToggle={() => setShowAllPendingExtensions((current) => !current)} />
            )}
          </div>
        )}

        {/* Historique des demandes de prolongation */}
        {visibleExtensionRequests.filter((r) => r.status !== 'pending').length > 0 && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-semibold">Historique des prolongations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Usager</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Ouvrage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Date demande</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {visibleExtensionRequests.filter((r) => r.status !== 'pending').slice(0, showAllExtensionHistory ? undefined : 10).map((req) => (
                    <tr key={req.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{req.userName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.book}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.requestDate}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {req.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleExtensionRequests.filter((r) => r.status !== 'pending').length > 10 && (
              <ShowMoreButton showAll={showAllExtensionHistory} onToggle={() => setShowAllExtensionHistory((current) => !current)} />
            )}
          </div>
        )}

        {/* Demandes de prêt */}
        {visibleLoanRequests.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-semibold">Demandes de prêt {!isStaff && '(vos demandes)'}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {isStaff ? 'Approuvez ou rejetez les demandes de prêt des membres.' : 'Suivi de vos demandes de prêt en attente.'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Usager</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Ouvrage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Date demande</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {visibleLoanRequests.slice(0, showAllLoanRequests ? undefined : 10).map((request) => (
                    <tr key={request.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{request.userName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.book}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.requestDate}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {request.status === 'pending' ? 'En attente' : request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex gap-2">
                          {isStaff && request.status === 'pending' ? (
                            <>
                              <button onClick={() => approveLoanRequest(request)} className="rounded-full bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700 flex items-center gap-1">
                                <Check size={14} /> Approuver
                              </button>
                              <button onClick={() => rejectLoanRequest(request.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700">Rejeter</button>
                            </>
                          ) : (
                            <>
                              {request.status === 'pending' && (
                                <button onClick={() => cancelLoanRequest(request.id)} className="rounded-full bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 flex items-center gap-1">
                                  <Trash2 size={14} /> Annuler
                                </button>
                              )}
                              {request.status !== 'pending' && <span className="text-gray-500 text-sm">-</span>}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleLoanRequests.length > 10 && (
              <ShowMoreButton showAll={showAllLoanRequests} onToggle={() => setShowAllLoanRequests((current) => !current)} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default Loans
