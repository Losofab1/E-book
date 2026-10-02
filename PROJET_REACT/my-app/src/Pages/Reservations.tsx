import { useEffect, useState } from 'react'
import { bookService } from '../services/bookService'
import { catalogCirculationService, type CatalogDocument, type CatalogDocumentReservation } from '../services/catalogCirculationService'
import { reservationService } from '../services/reservationService'
import { useAuth } from '../AuthContext'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'
import ShowMoreButton from '../Components/ui/ShowMoreButton'

type Book = { id: number; title: string }
type Reservation = { id: number; bookId: number; userId: number; status: string; reservedAt: string }

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

const reservationStatus = (status: string): [string, BadgeVariant] => {
  switch (status) {
    case 'WAITING': return ['En attente', 'warning']
    case 'READY_FOR_PICKUP': return ['Disponible', 'success']
    case 'PICKED_UP': return ['Récupéré — en prêt', 'success']
    case 'CANCELED': return ['Annulée', 'danger']
    case 'EXPIRED': return ['Expirée', 'neutral']
    default: return [status, 'neutral']
  }
}

const Reservations = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [items, setItems] = useState<Reservation[]>([])
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [documentReservations, setDocumentReservations] = useState<CatalogDocumentReservation[]>([])
  const [borrowedDocumentIds, setBorrowedDocumentIds] = useState<Set<number>>(new Set())
  const [showAllDocuments, setShowAllDocuments] = useState(false)
  const [bookId, setBookId] = useState('')
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const visibleDocuments = showAllDocuments ? documents : documents.slice(0, 10)
  const reload = async () => {
    setLoading(true)
    const [bookResult, reservationResult, documentsResult, documentReservationsResult, documentLoansResult] = await Promise.allSettled([
      bookService.getAll(), reservationService.getAll(), staff ? catalogCirculationService.getDocuments() : catalogCirculationService.getPublicDocuments(), catalogCirculationService.getReservations(), catalogCirculationService.getLoans(),
    ])
    if (bookResult.status === 'fulfilled') setBooks(bookResult.value.data as Book[])
    if (reservationResult.status === 'fulfilled') setItems(reservationResult.value.data as Reservation[])
    if (documentsResult.status === 'fulfilled') setDocuments(documentsResult.value.data)
    else if (staff) {
      try {
        const fallback = await catalogCirculationService.getPublicDocuments()
        if (Array.isArray(fallback.data)) setDocuments(fallback.data)
      } catch {
        /* message générique ci-dessous */
      }
    }
    if (documentReservationsResult.status === 'fulfilled') setDocumentReservations(documentReservationsResult.value.data)
    if (documentLoansResult.status === 'fulfilled' && Array.isArray(documentLoansResult.value.data)) {
      setBorrowedDocumentIds(new Set(
        documentLoansResult.value.data
          .filter((loan) => loan.status === 'BORROWED' && loan.userId === user?.id)
          .map((loan) => loan.catalogDocumentId),
      ))
    }
    if ([bookResult, reservationResult, documentsResult, documentReservationsResult, documentLoansResult].some(result => result.status === 'rejected')) {
      setMessage('Certaines réservations ou certains catalogues sont momentanément indisponibles.')
    }
    setLoading(false)
  }
  useEffect(() => { void reload() }, [user?.id, staff])
  const reserve = async () => {
    if (!user || !bookId) return
    try { await reservationService.create({ userId: user.id, bookId: Number(bookId) }); setMessage('Réservation enregistrée.'); setBookId(''); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Réservation impossible.') }
  }
  const ready = async (id: number) => { try { await reservationService.ready(id); setMessage('Réservation disponible pour retrait.'); await reload() } catch { setMessage('Opération impossible.') } }
  const pickupBook = async (id: number) => {
    try { await reservationService.pickup(id); setMessage('Récupération enregistrée — prêt de l’ouvrage créé. Voir page Prêts.'); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Récupération impossible.') }
  }
  const cancelBook = async (id: number) => {
    try { await reservationService.cancel(String(id)); setMessage('Réservation annulée.'); await reload() }
    catch { setMessage('Annulation impossible.') }
  }
  const reserveDocument = async (id: number) => {
    if (!user) return
    setDocumentId(id)
    try {
      await catalogCirculationService.createReservation({ userId: user.id, catalogDocumentId: id })
      setMessage('Réservation du catalogue enregistrée.')
      await reload()
    } catch (error: any) { setMessage(error.response?.data?.message ?? 'Réservation impossible.') }
    finally { setDocumentId(null) }
  }
  const readyDocument = async (id: number) => {
    try { await catalogCirculationService.markReservationReady(id); setMessage('Catalogue disponible pendant 48 heures.'); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Le catalogue ne peut pas encore être rendu disponible.') }
  }
  const pickupDocument = async (id: number) => {
    try { await catalogCirculationService.pickupReservation(id); setMessage('Récupération enregistrée — prêt du catalogue créé. Voir page Prêts.'); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Récupération impossible.') }
  }
  const cancelDocument = async (id: number) => {
    try { await catalogCirculationService.cancelReservation(id); setMessage('Réservation annulée.'); await reload() }
    catch { setMessage('Annulation impossible.') }
  }
  const digitalColumns: TableColumn<CatalogDocumentReservation>[] = [
    { key: 'document', label: 'Document', render: (item) => <span className="font-medium">{item.catalogDocumentName}</span> },
    ...(staff ? [{ key: 'user', label: 'Usager', render: (item: CatalogDocumentReservation) => item.userName } as TableColumn<CatalogDocumentReservation>] : []),
    {
      key: 'status',
      label: 'Statut',
      render: (item) => {
        const [label, variant] = reservationStatus(item.status)
        return <StatusBadge label={label} variant={variant} />
      },
    },
    { key: 'date', label: 'Demandé le', render: (item) => <span className="whitespace-nowrap">{new Date(item.reservedAt).toLocaleDateString('fr-FR')}</span> },
    {
      key: 'action',
      label: 'Action',
      render: (item) => (
        <div className="flex flex-wrap gap-3">
          {staff && item.status === 'WAITING' && <button type="button" onClick={() => void readyDocument(item.id)} className="text-sm font-medium text-primary-800 hover:underline">Rendre disponible</button>}
          {staff && item.status === 'READY_FOR_PICKUP' && <button type="button" onClick={() => void pickupDocument(item.id)} className="text-sm font-medium text-green-800 hover:underline">Confirmer récupération (→ prêt)</button>}
          {!staff && item.status === 'WAITING' && item.userId === user?.id && <button type="button" onClick={() => void cancelDocument(item.id)} className="text-sm font-medium text-red-700 hover:underline">Annuler</button>}
          {!staff && item.status === 'READY_FOR_PICKUP' && item.userId === user?.id && <><button type="button" onClick={() => void pickupDocument(item.id)} className="text-sm font-medium text-green-800 hover:underline">Récupérer (→ prêt)</button><button type="button" onClick={() => void cancelDocument(item.id)} className="text-sm font-medium text-red-700 hover:underline">Annuler</button></>}
        </div>
      ),
    },
  ]

  const bookColumns: TableColumn<Reservation>[] = [
    { key: 'book', label: 'Ouvrage', render: (item) => <span className="font-medium">{books.find(b => b.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</span> },
    {
      key: 'status',
      label: 'Statut',
      render: (item) => {
        const [label, variant] = reservationStatus(item.status)
        return <StatusBadge label={label} variant={variant} />
      },
    },
    { key: 'date', label: 'Date', render: (item) => <span className="whitespace-nowrap">{new Date(item.reservedAt).toLocaleDateString('fr-FR')}</span> },
    {
      key: 'action',
      label: 'Action',
      render: (item) => (
        <div className="flex flex-wrap gap-3">
          {staff && item.status === 'WAITING' && <button type="button" onClick={() => void ready(item.id)} className="text-sm font-medium text-primary-800 hover:underline">Rendre disponible</button>}
          {staff && item.status === 'READY_FOR_PICKUP' && <button type="button" onClick={() => void pickupBook(item.id)} className="text-sm font-medium text-green-800 hover:underline">Confirmer récupération (→ prêt)</button>}
          {!staff && item.status === 'WAITING' && item.userId === user?.id && <button type="button" onClick={() => void cancelBook(item.id)} className="text-sm font-medium text-red-700 hover:underline">Annuler</button>}
          {!staff && item.status === 'READY_FOR_PICKUP' && item.userId === user?.id && <><button type="button" onClick={() => void pickupBook(item.id)} className="text-sm font-medium text-green-800 hover:underline">Récupérer (→ prêt)</button><button type="button" onClick={() => void cancelBook(item.id)} className="text-sm font-medium text-red-700 hover:underline">Annuler</button></>}
        </div>
      ),
    },
  ]

  return <section className="page">
    <PageHeader
      eyebrow="Bibliothèque"
      title="Réservations"
      description="Réservez ouvrages et catalogues, suivez leur mise à disposition."
    />
    <section className="mt-6 border-y border-slate-200 py-5" aria-labelledby="digital-catalog-reservations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="digital-catalog-reservations" className="text-xl font-bold">Catalogues PDF/CSV</h2><p className="mt-1 text-sm text-slate-600">Réservez un document emprunté ; le personnel pourra le mettre à votre disposition pendant 48 heures.</p></div>
        <span className="text-sm text-slate-600">{documents.filter(document => document.available).length} disponible(s) · {documents.filter(document => !document.available).length} emprunté(s)</span>
      </div>
      {loading && <p className="mt-4 text-sm text-slate-600">Chargement des catalogues numériques…</p>}
      {!loading && documents.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun document PDF/CSV importé.</p>}
      <div className="mt-4 divide-y divide-slate-200">
        {visibleDocuments.map(document => {
          const existingReservation = documentReservations.find(item => item.userId === user?.id && item.catalogDocumentId === document.id && ['WAITING', 'READY_FOR_PICKUP'].includes(item.status))
          const alreadyBorrowed = borrowedDocumentIds.has(document.id)
          return <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate font-semibold">{document.name}</p><p className="mt-1 text-sm text-slate-600">{(document.contentType ?? '').toLowerCase().includes('pdf') ? 'PDF' : 'CSV'} · {document.totalCopies ?? 10} ex. · {document.availableCopies ?? (document.available ? document.totalCopies ?? 10 : 0)} disponible(s) · {alreadyBorrowed ? 'Déjà en prêt pour vous' : document.available ? 'Disponible' : document.dueAt ? `Indisponible jusqu’au ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : 'Réservation prioritaire en cours'} · {document.waitingReservations} réservation(s) en attente</p></div>
            {!staff && <button type="button" disabled={document.available || alreadyBorrowed || documentId === document.id || Boolean(existingReservation)} onClick={() => void reserveDocument(document.id)} title={alreadyBorrowed ? 'Vous avez déjà ce catalogue en prêt' : undefined} className="btn-outline shrink-0 px-3 py-2 text-sm disabled:cursor-not-allowed">{alreadyBorrowed ? 'Déjà emprunté' : existingReservation ? existingReservation.status === 'READY_FOR_PICKUP' ? 'Disponible pour vous' : 'Déjà réservé' : document.available ? 'Disponible dans Prêts' : documentId === document.id ? 'Envoi…' : 'Réserver'}</button>}
          </div>
        })}
      </div>
      {documents.length > 10 && (
        <ShowMoreButton showAll={showAllDocuments} onToggle={() => setShowAllDocuments((current) => !current)} />
      )}
    </section>

    <section className="mt-6" aria-labelledby="digital-reservation-history">
      <h2 id="digital-reservation-history" className="mb-3 text-xl font-bold">Réservations de catalogues numériques</h2>
      {loading
        ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>
        : <div className="table-card"><DataTable columns={digitalColumns} data={documentReservations} emptyMessage="Aucune réservation de catalogue numérique." rowKey={(item) => String(item.id)} /></div>}
    </section>

    {!staff && <div className="card mt-5 flex gap-3"><select value={bookId} onChange={e => setBookId(e.target.value)} className="input flex-1"><option value="">Choisir un ouvrage</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select><button type="button" onClick={() => void reserve()} className="btn-primary">Réserver</button></div>}
    {message && <Alert>{message}</Alert>}
    <div className="mt-5">
      <h2 className="mb-3 text-xl font-bold">Réservations d’ouvrages</h2>
      {loading
        ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>
        : <div className="table-card"><DataTable columns={bookColumns} data={items} emptyMessage="Aucune réservation d’ouvrage." rowKey={(item) => String(item.id)} /></div>}
    </div>
  </section>
}
export default Reservations
