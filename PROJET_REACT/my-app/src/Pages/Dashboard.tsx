import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText, CalendarClock, Layers, Plus } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../AuthContext'
import { bookService } from '../services/bookService'
import { loanService } from '../services/loanService'
import { reservationService } from '../services/reservationService'
import { catalogCirculationService, type CatalogDocument } from '../services/catalogCirculationService'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'

type BookRow = { id: number; availableCopies: number; active?: boolean }
type LoanRow = { status: string; dueAt: string }
type ReservationRow = { status: string }

interface DashboardStats {
  books: number
  availableCopies: number
  loansActive: number
  loansOverdue: number
  reservationsActive: number
  documentsTotal: number
  documentsAvailable: number
  documentLoansActive: number
}

const asArray = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? (value as Record<string, unknown>[]) : [])

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [booksRes, loansRes, reservationsRes, documentsRes, documentLoansRes, documentReservationsRes] = await Promise.all([
          bookService.getAll(),
          loanService.getAll(),
          reservationService.getAll(),
          catalogCirculationService.getDocuments(),
          catalogCirculationService.getLoans(),
          catalogCirculationService.getReservations(),
        ])
        if (cancelled) return
        const books = asArray(booksRes.data) as unknown as BookRow[]
        const loans = asArray(loansRes.data) as unknown as LoanRow[]
        const reservations = asArray(reservationsRes.data) as unknown as ReservationRow[]
        const documents = asArray(documentsRes.data) as unknown as CatalogDocument[]
        const documentLoans = asArray(documentLoansRes.data) as unknown as LoanRow[]
        const documentReservations = asArray(documentReservationsRes.data) as unknown as ReservationRow[]
        const now = Date.now()
        setStats({
          books: books.length,
          availableCopies: books.reduce((sum, book) => sum + (book.availableCopies ?? 0), 0),
          loansActive: loans.filter((loan) => loan.status === 'BORROWED').length
            + documentLoans.filter((loan) => loan.status === 'BORROWED').length,
          loansOverdue: [...loans, ...documentLoans].filter(
            (loan) => loan.status === 'BORROWED' && loan.dueAt && new Date(loan.dueAt).getTime() < now,
          ).length,
          reservationsActive: [...reservations, ...documentReservations].filter(
            (item) => item.status === 'WAITING' || item.status === 'READY_FOR_PICKUP',
          ).length,
          documentsTotal: documents.length,
          documentsAvailable: documents.filter((document) => document.available).length,
          documentLoansActive: documentLoans.filter((loan) => loan.status === 'BORROWED').length,
        })
      } catch {
        if (!cancelled) {
          try {
            const [books, loans, reservations] = await Promise.all([bookService.getAll(), api.get('/digital/loans'), api.get('/digital/reservations')])
            if (!cancelled && Array.isArray(books.data) && Array.isArray(loans.data) && Array.isArray(reservations.data)) {
              setStats({
                books: books.data.length,
                availableCopies: (books.data as BookRow[]).reduce((sum, book) => sum + (book.availableCopies ?? 0), 0),
                loansActive: (loans.data as LoanRow[]).filter((loan) => loan.status === 'BORROWED').length,
                loansOverdue: 0,
                reservationsActive: (reservations.data as ReservationRow[]).filter(
                  (item) => item.status === 'WAITING' || item.status === 'READY_FOR_PICKUP',
                ).length,
                documentsTotal: 0,
                documentsAvailable: 0,
                documentLoansActive: 0,
              })
            } else if (!cancelled) {
              setError('Impossible de charger les indicateurs du serveur.')
            }
          } catch {
            if (!cancelled) setError('Impossible de charger les indicateurs du serveur.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <section className="page">
      <PageHeader
        eyebrow="Administration"
        title="Tableau de bord"
        description="Activité générale de la bibliothèque, synchronisée avec prêts, réservations et catalogues."
      />
      {error && <Alert variant="error">{error}</Alert>}
      {loading && <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement des indicateurs…</p>}
      {!loading && !error && (
        <div className="card mt-6">
          <h2 className="text-xl font-bold">Actions rapides</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/loans" className="btn-primary"><Plus size={18} />Nouveau prêt</Link>
            <Link to="/reservations" className="btn-outline">Gérer les réservations</Link>
            <Link to="/catalog" className="btn-outline">Gérer le catalogue</Link>
            {user?.role === 'admin' && <Link to="/users" className="btn-outline">Gérer les usagers</Link>}
          </div>
        </div>
      )}
      {!loading && !error && stats && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/catalog" className="card transition hover:border-primary-300">
              <div className="flex items-center gap-3 text-slate-600"><BookOpenText size={20} className="text-primary-700" /><p>Ouvrages</p></div>
              <p className="mt-2 text-3xl font-bold">{stats.books}</p>
              <p className="mt-1 text-sm text-slate-600">{stats.availableCopies} exemplaire(s) disponible(s)</p>
            </Link>
            <Link to="/loans" className="card transition hover:border-primary-300">
              <div className="flex items-center gap-3 text-slate-600"><Layers size={20} className="text-primary-700" /><p>Prêts en cours</p></div>
              <p className="mt-2 text-3xl font-bold">{stats.loansActive}</p>
              <p className="mt-1 text-sm text-slate-600">dont {stats.documentLoansActive} catalogue(s) numérique(s)</p>
            </Link>
            <Link to="/reservations" className="card transition hover:border-primary-300">
              <div className="flex items-center gap-3 text-slate-600"><CalendarClock size={20} className="text-primary-700" /><p>Réservations actives</p></div>
              <p className="mt-2 text-3xl font-bold">{stats.reservationsActive}</p>
              <p className="mt-1 text-sm text-slate-600">en attente ou prêtes au retrait</p>
            </Link>
          </div>
          <div className="card mt-4">
            <h2 className="text-xl font-bold">Détails généraux</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-slate-600">Catalogues numériques disponibles</dt>
                <dd className="font-semibold">{stats.documentsAvailable} / {stats.documentsTotal}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-slate-600">Prêts en retard</dt>
                <dd>{stats.loansOverdue > 0
                  ? <StatusBadge label={`${stats.loansOverdue} en retard`} variant="danger" />
                  : <StatusBadge label="Aucun retard" variant="success" />}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-slate-600">Exemplaires disponibles</dt>
                <dd className="font-semibold">{stats.availableCopies}</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </section>
  )
}
export default Dashboard
