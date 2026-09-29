import { useEffect, useState } from 'react'
import { BookOpenText, CalendarClock, Check, RotateCcw, Search, UserRound } from 'lucide-react'
import { api } from '../services/api'
import { bookService } from '../services/bookService'
import { loanService } from '../services/loanService'
import { useAuth } from '../AuthContext'

type Book = { id: number; title: string; author?: string; category?: string; availableCopies: number; active?: boolean }
type User = { id: number; name: string; actif?: boolean }
type Loan = { id: number; userId: number; bookId: number; status: string; borrowedAt: string; dueAt: string }

const Loans = () => {
  const { user } = useAuth()
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const [items, setItems] = useState<Loan[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [loansError, setLoansError] = useState('')
  const [usersError, setUsersError] = useState('')
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadingCatalog(true)
      setLoadingLoans(true)
      setLoadingUsers(staff)
      setCatalogError('')
      setLoansError('')
      setUsersError('')

      const [bookResult, loanResult] = await Promise.allSettled([bookService.getAll(), loanService.getAll()])
      if (cancelled) return

      if (bookResult.status === 'fulfilled' && Array.isArray(bookResult.value.data)) {
        setBooks(bookResult.value.data as Book[])
      } else {
        setCatalogError('Le catalogue est momentanément indisponible.')
      }
      setLoadingCatalog(false)

      if (loanResult.status === 'fulfilled' && Array.isArray(loanResult.value.data)) {
        setItems(loanResult.value.data as Loan[])
      } else {
        setLoansError('Impossible de charger les prêts.')
      }
      setLoadingLoans(false)

      if (staff) {
        try {
          const response = await api.get<User[]>('/admin/users')
          if (!cancelled) setUsers(response.data)
        } catch {
          if (!cancelled) setUsersError('Impossible de charger les usagers.')
        } finally {
          if (!cancelled) setLoadingUsers(false)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [staff, refreshKey])

  const availableBooks = books.filter(book => book.active !== false && book.availableCopies > 0)
  const searchTerm = search.trim().toLocaleLowerCase('fr')
  const filteredBooks = availableBooks.filter(book =>
    [book.title, book.author, book.category].some(value => value?.toLocaleLowerCase('fr').includes(searchTerm))
  )
  const selectedBookDetails = books.find(book => String(book.id) === selectedBook)

  const create = async () => {
    if (!selectedUser || !selectedBook) return
    setSubmitting(true)
    setMessage('')
    try {
      await loanService.create({ userId: Number(selectedUser), bookId: Number(selectedBook) })
      setMessage('Prêt enregistré.')
      setSelectedBook('')
      setSearch('')
      setRefreshKey(key => key + 1)
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Création impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const returnLoan = async (id: number) => {
    try {
      await loanService.returnLoan(String(id))
      setMessage('Retour enregistré.')
      setRefreshKey(key => key + 1)
    } catch {
      setMessage('Retour impossible.')
    }
  }

  const extendLoan = async (item: Loan) => {
    const dueAt = new Date(item.dueAt)
    dueAt.setDate(dueAt.getDate() + 14)
    try {
      await loanService.extendLoan(String(item.id), dueAt.toISOString())
      setMessage('Prêt prolongé de 14 jours.')
      setRefreshKey(key => key + 1)
    } catch {
      setMessage('Prolongation impossible.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 text-slate-900 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Bibliothèque</p>
          <h1 className="mt-1 text-3xl font-bold">{staff ? 'Gestion des prêts' : 'Mes emprunts'}</h1>
          <p className="mt-2 text-slate-600">{staff ? 'Choisissez un usager et un ouvrage disponible.' : 'Consultez vos ouvrages empruntés et leurs échéances.'}</p>
        </div>
        {staff && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-900">{availableBooks.length} ouvrage{availableBooks.length === 1 ? '' : 's'} disponible{availableBooks.length === 1 ? '' : 's'}</div>}
      </header>

      {staff && (
        <section className="mt-7 border-y border-slate-200 py-6" aria-labelledby="new-loan-title">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-green-100 p-2 text-green-800"><BookOpenText size={20} /></span>
            <div>
              <h2 id="new-loan-title" className="text-xl font-bold">Nouveau prêt</h2>
              <p className="text-sm text-slate-600">Les ouvrages sans exemplaire disponible ne sont pas sélectionnables.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <label htmlFor="loan-user" className="mb-2 block text-sm font-semibold">Usager</label>
              <div className="relative">
                <UserRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select id="loan-user" value={selectedUser} onChange={event => setSelectedUser(event.target.value)} disabled={loadingUsers || users.length === 0} className="w-full rounded-md border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 disabled:bg-slate-100">
                  <option value="">{loadingUsers ? 'Chargement des usagers…' : 'Sélectionner un usager'}</option>
                  {users.filter(person => person.actif !== false).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </div>
              {usersError && <p role="alert" className="mt-2 text-sm text-red-700">{usersError}</p>}
            </div>

            <div>
              <label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold">Catalogue des ouvrages</label>
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="catalog-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par titre, auteur ou catégorie" className="w-full rounded-md border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none placeholder:text-slate-500 focus:border-green-700 focus:ring-2 focus:ring-green-700/20" />
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1" aria-label="Ouvrages disponibles">
                {loadingCatalog && <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Chargement du catalogue…</p>}
                {!loadingCatalog && catalogError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{catalogError}</p>}
                {!loadingCatalog && !catalogError && availableBooks.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Aucun ouvrage disponible pour un nouveau prêt.</p>}
                {!loadingCatalog && !catalogError && availableBooks.length > 0 && filteredBooks.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Aucun ouvrage ne correspond à cette recherche.</p>}
                {!loadingCatalog && !catalogError && filteredBooks.map(book => {
                  const selected = selectedBook === String(book.id)
                  return (
                    <button key={book.id} type="button" aria-pressed={selected} onClick={() => setSelectedBook(String(book.id))} className={`flex w-full items-center justify-between gap-4 rounded-md border p-3 text-left transition-colors ${selected ? 'border-green-700 bg-green-50 ring-1 ring-green-700' : 'border-slate-200 bg-white hover:border-green-500 hover:bg-green-50/50'}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{book.title}</span>
                        <span className="mt-1 block truncate text-sm text-slate-600">{[book.author, book.category].filter(Boolean).join(' · ') || 'Détails non renseignés'}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs font-medium text-green-800">{book.availableCopies} ex.</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">{selectedBookDetails ? `Ouvrage choisi : ${selectedBookDetails.title}` : 'Aucun ouvrage sélectionné'}</p>
            <button type="button" onClick={() => void create()} disabled={!selectedUser || !selectedBook || submitting || loadingCatalog || loadingUsers} className="inline-flex items-center gap-2 rounded-md bg-green-800 px-4 py-2.5 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-slate-300">
              <Check size={18} />{submitting ? 'Enregistrement…' : 'Créer le prêt'}
            </button>
          </div>
        </section>
      )}

      {catalogError && !staff && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{catalogError}</p>}
      {loansError && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{loansError}</p>}
      {message && <p role="status" className="mt-5 rounded-md border border-slate-200 bg-white p-4 text-slate-800">{message}</p>}

      <section className="mt-7" aria-labelledby="loan-list-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="loan-list-title" className="text-xl font-bold">{staff ? 'Prêts en cours et historique' : 'Mes prêts'}</h2>
          <span className="text-sm text-slate-600">{loadingLoans ? 'Chargement…' : `${items.length} prêt${items.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left">
            <thead className="bg-slate-100 text-sm text-slate-700"><tr><th className="p-3">Ouvrage</th>{staff && <th className="p-3">Usager</th>}<th className="p-3">Échéance</th><th className="p-3">Statut</th>{staff && <th className="p-3">Actions</th>}</tr></thead>
            <tbody>
              {!loadingLoans && !loansError && items.map(item => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="p-3 font-medium">{books.find(book => book.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</td>
                  {staff && <td className="p-3">{users.find(person => person.id === item.userId)?.name ?? `Usager #${item.userId}`}</td>}
                  <td className="whitespace-nowrap p-3">{new Date(item.dueAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'BORROWED' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{item.status === 'BORROWED' ? 'En cours' : item.status === 'RETURNED' ? 'Rendu' : item.status}</span></td>
                  {staff && <td className="p-3"><div className="flex flex-wrap gap-3">{item.status === 'BORROWED' && <><button type="button" onClick={() => void extendLoan(item)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:underline"><CalendarClock size={16} />Prolonger</button><button type="button" onClick={() => void returnLoan(item.id)} className="inline-flex items-center gap-1 text-sm font-medium text-green-800 hover:underline"><RotateCcw size={16} />Retour</button></>}</div></td>}
                </tr>
              ))}
              {!loadingLoans && !loansError && items.length === 0 && <tr><td colSpan={staff ? 5 : 3} className="p-8 text-center text-slate-600">Aucun prêt à afficher.</td></tr>}
              {loadingLoans && <tr><td colSpan={staff ? 5 : 3} className="p-8 text-center text-slate-600">Chargement des prêts…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
export default Loans
