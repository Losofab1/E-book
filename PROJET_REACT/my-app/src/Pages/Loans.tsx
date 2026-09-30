import { useEffect, useState } from 'react'
import { BookOpenText, CalendarClock, RotateCcw, Search, UserRound } from 'lucide-react'
import { api } from '../services/api'
import { bookService } from '../services/bookService'
import { catalogCirculationService, type CatalogDocument, type CatalogDocumentLoan } from '../services/catalogCirculationService'
import { loanService } from '../services/loanService'
import { useAuth } from '../AuthContext'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'

type Book = { id: number; title: string; author?: string; category?: string; availableCopies: number; active?: boolean }
type User = { id: number; name: string; actif?: boolean }
type Loan = { id: number; userId: number; bookId: number; status: string; borrowedAt: string; dueAt: string }

const Loans = () => {
  const { user } = useAuth()
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const [items, setItems] = useState<Loan[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [documentLoans, setDocumentLoans] = useState<CatalogDocumentLoan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedBookUser, setSelectedBookUser] = useState('')
  const [selectedDocumentUser, setSelectedDocumentUser] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [loansError, setLoansError] = useState('')
  const [documentsError, setDocumentsError] = useState('')
  const [documentLoansError, setDocumentLoansError] = useState('')
  const [usersError, setUsersError] = useState('')
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [loadingDocumentLoans, setLoadingDocumentLoans] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadingCatalog(true)
      setLoadingLoans(true)
      setLoadingDocuments(true)
      setLoadingDocumentLoans(true)
      setLoadingUsers(staff)
      setCatalogError('')
      setLoansError('')
      setDocumentsError('')
      setDocumentLoansError('')
      setUsersError('')

      const [bookResult, loanResult, documentResult, documentLoanResult] = await Promise.allSettled([
        bookService.getAll(), loanService.getAll(), catalogCirculationService.getDocuments(), catalogCirculationService.getLoans(),
      ])
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

      if (documentResult.status === 'fulfilled' && Array.isArray(documentResult.value.data)) {
        setDocuments(documentResult.value.data)
      } else {
        setDocumentsError('Impossible de charger les documents PDF/CSV.')
      }
      setLoadingDocuments(false)

      if (documentLoanResult.status === 'fulfilled' && Array.isArray(documentLoanResult.value.data)) {
        setDocumentLoans(documentLoanResult.value.data)
      } else {
        setDocumentLoansError('Impossible de charger les prêts de documents.')
      }
      setLoadingDocumentLoans(false)

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
  const createBookLoan = async (bookId: number) => {
    if (!selectedBookUser) {
      setMessage('Sélectionnez d’abord un usager pour prêter cet ouvrage.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await loanService.create({ userId: Number(selectedBookUser), bookId })
      setMessage('Prêt de l’ouvrage enregistré.')
      setSearch('')
      setRefreshKey(key => key + 1)
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Création impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const bookStockColumns: TableColumn<Book>[] = [
    {
      key: 'title',
      label: 'Ouvrage',
      render: (book) => (
        <span className="min-w-0">
          <span className="block font-semibold">{book.title}</span>
          <span className="mt-1 block text-sm text-slate-600">{[book.author, book.category].filter(Boolean).join(' · ') || 'Détails non renseignés'}</span>
        </span>
      ),
    },
    { key: 'copies', label: 'Ex.', render: (book) => <span className="font-medium text-primary-800">{book.availableCopies} ex.</span> },
    {
      key: 'action',
      label: 'Prêt',
      render: (book) => (
        <button
          type="button"
          onClick={() => void createBookLoan(book.id)}
          disabled={submitting}
          className="btn-primary px-3 py-1.5 text-sm"
        >
          {submitting ? 'Enregistrement…' : 'Prêter'}
        </button>
      ),
    },
  ]

  const createDocumentLoan = async (catalogDocumentId: number) => {
    if (!selectedDocumentUser) {
      setMessage('Sélectionnez d’abord un usager pour prêter ce catalogue.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await catalogCirculationService.createLoan({ userId: Number(selectedDocumentUser), catalogDocumentId })
      setMessage('Emprunt du document enregistré.')
      setRefreshKey(key => key + 1)
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Création du prêt de document impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const documentStockColumns: TableColumn<CatalogDocument>[] = [
    {
      key: 'name',
      label: 'Catalogue',
      render: (document) => (
        <span className="min-w-0">
          <span className="block font-semibold">{document.name}</span>
          <span className="mt-1 block text-sm text-slate-600">
            {document.contentType.includes('pdf') ? 'PDF' : 'CSV'}
            {!document.available && document.dueAt ? ` · Retour le ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : ''}
            {` · ${document.waitingReservations} réservation(s) en attente`}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (document) => (document.available
        ? <StatusBadge label="Disponible" variant="success" />
        : <StatusBadge label="Emprunté" variant="warning" />),
    },
    {
      key: 'action',
      label: 'Prêt',
      render: (document) => (
        <button
          type="button"
          onClick={() => void createDocumentLoan(document.id)}
          disabled={!document.available || submitting}
          title={document.available ? 'Prêter ce catalogue' : 'Catalogue actuellement emprunté'}
          className="btn-primary px-3 py-1.5 text-sm"
        >
          {submitting ? 'Enregistrement…' : 'Prêter'}
        </button>
      ),
    },
  ]

  const returnLoan = async (id: number) => {
    try {
      await loanService.returnLoan(String(id))
      setMessage('Retour enregistré.')
      setRefreshKey(key => key + 1)
    } catch {
      setMessage('Retour impossible.')
    }
  }

  const downloadDocument = async (id: number, name: string) => {
    try {
      await catalogCirculationService.download(id, name)
    } catch {
      setMessage('Téléchargement impossible. Vérifiez que votre prêt est toujours actif.')
    }
  }

  const returnDocumentLoan = async (id: number) => {
    try {
      await catalogCirculationService.returnLoan(id)
      setMessage('Retour du document enregistré.')
      setRefreshKey(key => key + 1)
    } catch {
      setMessage('Retour impossible.')
    }
  }

  const extendDocumentLoan = async (item: CatalogDocumentLoan) => {
    const dueAt = new Date(item.dueAt)
    dueAt.setDate(dueAt.getDate() + 14)
    try {
      await catalogCirculationService.extendLoan(item.id, dueAt.toISOString())
      setMessage('Emprunt du document prolongé de 14 jours.')
      setRefreshKey(key => key + 1)
    } catch {
      setMessage('Prolongation impossible.')
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
    <section className="page">
      <PageHeader
        eyebrow="Bibliothèque"
        title={staff ? 'Gestion des prêts' : 'Mes emprunts'}
        description={staff ? 'Prêtez des ouvrages ou des catalogues PDF/CSV.' : 'Consultez vos prêts et téléchargez les catalogues empruntés.'}
        extra={staff && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-900">{availableBooks.length + documents.filter(document => document.available).length} ressource(s) disponible(s)</div>}
      />

      {staff && (
        <section className="mt-7 border-y border-slate-200 py-6" aria-labelledby="new-loan-title">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-green-100 p-2 text-green-800"><BookOpenText size={20} /></span>
            <div>
              <h2 id="new-loan-title" className="text-xl font-bold">Nouveau prêt</h2>
              <p className="text-sm text-slate-600">Les ouvrages sans exemplaire disponible ne sont pas sélectionnables.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <label htmlFor="loan-user" className="mb-2 block text-sm font-semibold">Usager</label>
              <div className="relative">
                <UserRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select id="loan-user" value={selectedBookUser} onChange={event => setSelectedBookUser(event.target.value)} disabled={loadingUsers || users.length === 0} className="w-full rounded-md border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 disabled:bg-slate-100">
                  <option value="">{loadingUsers ? 'Chargement des usagers…' : 'Sélectionner un usager'}</option>
                  {users.filter(person => person.actif !== false).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </div>
              {usersError && <p role="alert" className="mt-2 text-sm text-red-700">{usersError}</p>}
            </div>

            <div>
              <label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold">Stock des ouvrages ({filteredBooks.length})</label>
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="catalog-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par titre, auteur ou catégorie" className="w-full rounded-md border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none placeholder:text-slate-500 focus:border-green-700 focus:ring-2 focus:ring-green-700/20" />
              </div>

              <div className="mt-3">
                {loadingCatalog && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement du catalogue…</p>}
                {!loadingCatalog && catalogError && <Alert variant="error">{catalogError}</Alert>}
                {!loadingCatalog && !catalogError && (
                  <div className="table-card">
                    <DataTable
                      columns={bookStockColumns}
                      data={filteredBooks}
                      emptyMessage={availableBooks.length === 0 ? 'Aucun ouvrage disponible pour un nouveau prêt.' : 'Aucun ouvrage ne correspond à cette recherche.'}
                      rowKey={(book) => String(book.id)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">Prêt direct : choisissez l’usager, puis cliquez sur <strong>Prêter</strong> dans le tableau (10 ouvrages par page, <strong>Voir plus</strong> pour la suite).</p>
        </section>
      )}

      {staff && (
        <section className="mt-7 border-b border-slate-200 pb-6" aria-labelledby="digital-loan-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="digital-loan-title" className="text-xl font-bold">Prêter un catalogue PDF/CSV</h2>
              <p className="mt-1 text-sm text-slate-600">Un document numérique ne peut être prêté qu’à une personne à la fois.</p>
            </div>
            <span className="text-sm text-slate-600">{documents.filter(document => document.available).length} disponible(s)</span>
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="digital-loan-user" className="mb-2 block text-sm font-semibold">Usager</label>
              <select id="digital-loan-user" value={selectedDocumentUser} onChange={event => setSelectedDocumentUser(event.target.value)} disabled={loadingUsers || users.length === 0} className="w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 disabled:bg-slate-100">
                <option value="">{loadingUsers ? 'Chargement des usagers…' : 'Sélectionner un usager'}</option>
                {users.filter(person => person.actif !== false).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </div>
            <div>
              <span id="digital-document-label" className="mb-2 block text-sm font-semibold">Stock des catalogues ({documents.length})</span>
              <div aria-labelledby="digital-document-label">
                {loadingDocuments && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement des catalogues…</p>}
                {!loadingDocuments && documentsError && <Alert variant="error">{documentsError}</Alert>}
                {!loadingDocuments && !documentsError && (
                  <div className="table-card">
                    <DataTable
                      columns={documentStockColumns}
                      data={documents}
                      emptyMessage="Aucun catalogue numérique importé."
                      rowKey={(document) => String(document.id)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">Prêt direct : choisissez l’usager, puis cliquez sur <strong>Prêter</strong> dans le tableau (10 catalogues par page, <strong>Voir plus</strong> pour la suite).</p>
        </section>
      )}

      {catalogError && !staff && <Alert variant="error">{catalogError}</Alert>}
      {loansError && <Alert variant="error">{loansError}</Alert>}
      {message && <Alert>{message}</Alert>}

      <section className="mt-7" aria-labelledby="loan-list-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="loan-list-title" className="text-xl font-bold">{staff ? 'Prêts en cours et historique' : 'Mes prêts'}</h2>
          <span className="text-sm text-slate-600">{loadingLoans ? 'Chargement…' : `${items.length} prêt${items.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left">
            <thead className="bg-slate-100 text-sm text-slate-700"><tr><th className="p-3">Ouvrage</th>{staff && <th className="p-3">Usager</th>}<th className="p-3">Échéance</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
              {!loadingLoans && !loansError && items.map(item => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="p-3 font-medium">{books.find(book => book.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</td>
                  {staff && <td className="p-3">{users.find(person => person.id === item.userId)?.name ?? `Usager #${item.userId}`}</td>}
                  <td className="whitespace-nowrap p-3">{new Date(item.dueAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{item.status === 'BORROWED'
                    ? <StatusBadge label="En cours" variant="warning" />
                    : item.status === 'RETURNED'
                      ? <StatusBadge label="Rendu" variant="success" />
                      : <StatusBadge label={item.status} variant="neutral" />}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-3">{item.status === 'BORROWED' && <>{staff && <button type="button" onClick={() => void extendLoan(item)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:underline"><CalendarClock size={16} />Prolonger</button>}<button type="button" onClick={() => void returnLoan(item.id)} className="inline-flex items-center gap-1 text-sm font-medium text-green-800 hover:underline"><RotateCcw size={16} />Retour</button></>}</div></td>
                </tr>
              ))}
              {!loadingLoans && !loansError && items.length === 0 && <tr><td colSpan={staff ? 5 : 4} className="p-8 text-center text-slate-600">Aucun prêt à afficher.</td></tr>}
              {loadingLoans && <tr><td colSpan={staff ? 5 : 4} className="p-8 text-center text-slate-600">Chargement des prêts…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="document-loan-list-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="document-loan-list-title" className="text-xl font-bold">Prêts de catalogues PDF/CSV</h2>
          <span className="text-sm text-slate-600">{loadingDocumentLoans ? 'Chargement…' : `${documentLoans.length} prêt${documentLoans.length === 1 ? '' : 's'}`}</span>
        </div>
        {documentLoansError && <Alert variant="error" className="mb-3">{documentLoansError}</Alert>}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left">
            <thead className="bg-slate-100 text-sm text-slate-700"><tr><th className="p-3">Document</th>{staff && <th className="p-3">Usager</th>}<th className="p-3">Échéance</th><th className="p-3">Statut</th>{staff && <th className="p-3">Fichier</th>}<th className="p-3">Actions</th></tr></thead>
            <tbody>
              {!loadingDocumentLoans && !documentLoansError && documentLoans.map(item => <tr key={item.id} className="border-t border-slate-200">
                <td className="p-3 font-medium">{item.catalogDocumentName}</td>
                {staff && <td className="p-3">{item.userName}</td>}
                <td className="whitespace-nowrap p-3">{new Date(item.dueAt).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">{item.status === 'BORROWED'
                  ? <StatusBadge label="En cours" variant="warning" />
                  : <StatusBadge label="Rendu" variant="success" />}</td>
                {staff && <td className="p-3">{item.status === 'BORROWED' && <button type="button" onClick={() => void downloadDocument(item.catalogDocumentId, item.catalogDocumentName)} className="font-medium text-green-800 hover:underline">Télécharger</button>}</td>}
                <td className="p-3"><div className="flex flex-wrap gap-3">{item.status === 'BORROWED' && <>{staff && <button type="button" onClick={() => void extendDocumentLoan(item)} className="text-sm font-medium text-blue-800 hover:underline">Prolonger</button>}<button type="button" onClick={() => void returnDocumentLoan(item.id)} className="text-sm font-medium text-green-800 hover:underline">Retour</button></>}</div></td>
              </tr>)}
              {!loadingDocumentLoans && !documentLoansError && documentLoans.length === 0 && <tr><td colSpan={staff ? 6 : 4} className="p-8 text-center text-slate-600">Aucun prêt de catalogue numérique.</td></tr>}
              {loadingDocumentLoans && <tr><td colSpan={staff ? 6 : 4} className="p-8 text-center text-slate-600">Chargement des prêts numériques…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
export default Loans
