import { useEffect, useState } from 'react'
import { bookService } from '../services/bookService'
import { catalogCirculationService, type CatalogDocument, type CatalogDocumentReservation } from '../services/catalogCirculationService'
import { reservationService } from '../services/reservationService'
import { useAuth } from '../AuthContext'

type Book = { id: number; title: string }
type Reservation = { id: number; bookId: number; userId: number; status: string; reservedAt: string }

const Reservations = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [items, setItems] = useState<Reservation[]>([])
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [documentReservations, setDocumentReservations] = useState<CatalogDocumentReservation[]>([])
  const [bookId, setBookId] = useState('')
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const reload = async () => {
    setLoading(true)
    const [bookResult, reservationResult, documentsResult, documentReservationsResult] = await Promise.allSettled([
      bookService.getAll(), reservationService.getAll(), catalogCirculationService.getDocuments(), catalogCirculationService.getReservations(),
    ])
    if (bookResult.status === 'fulfilled') setBooks(bookResult.value.data as Book[])
    if (reservationResult.status === 'fulfilled') setItems(reservationResult.value.data as Reservation[])
    if (documentsResult.status === 'fulfilled') setDocuments(documentsResult.value.data)
    if (documentReservationsResult.status === 'fulfilled') setDocumentReservations(documentReservationsResult.value.data)
    if ([bookResult, reservationResult, documentsResult, documentReservationsResult].some(result => result.status === 'rejected')) {
      setMessage('Certaines réservations ou certains catalogues sont momentanément indisponibles.')
    }
    setLoading(false)
  }
  useEffect(() => { void reload() }, [])
  const reserve = async () => {
    if (!user || !bookId) return
    try { await reservationService.create({ userId: user.id, bookId: Number(bookId) }); setMessage('Réservation enregistrée.'); setBookId(''); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Réservation impossible.') }
  }
  const ready = async (id: number) => { try { await reservationService.ready(id); setMessage('Réservation disponible pour retrait.'); await reload() } catch { setMessage('Opération impossible.') } }
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
  const cancelDocument = async (id: number) => {
    try { await catalogCirculationService.cancelReservation(id); setMessage('Réservation annulée.'); await reload() }
    catch { setMessage('Annulation impossible.') }
  }
  const downloadDocument = async (id: number, name: string) => {
    try { await catalogCirculationService.download(id, name) }
    catch { setMessage('Téléchargement impossible. La période de mise à disposition a peut-être expiré.') }
  }
  return <section className="mx-auto max-w-5xl px-4 py-10 text-slate-900"><h1 className="text-3xl font-bold">Réservations</h1>
    <section className="mt-6 border-y border-slate-200 py-5" aria-labelledby="digital-catalog-reservations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="digital-catalog-reservations" className="text-xl font-bold">Catalogues PDF/CSV</h2><p className="mt-1 text-sm text-slate-600">Réservez un document emprunté ; le personnel pourra le mettre à votre disposition pendant 48 heures.</p></div>
        <span className="text-sm text-slate-600">{documents.filter(document => document.available).length} disponible(s) · {documents.filter(document => !document.available).length} emprunté(s)</span>
      </div>
      {loading && <p className="mt-4 text-sm text-slate-600">Chargement des catalogues numériques…</p>}
      {!loading && documents.length === 0 && <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">Aucun document PDF/CSV importé.</p>}
      <div className="mt-4 divide-y divide-slate-200">
        {documents.map(document => {
          const existingReservation = documentReservations.find(item => item.userId === user?.id && item.catalogDocumentId === document.id && ['WAITING', 'READY_FOR_PICKUP'].includes(item.status))
          return <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate font-semibold">{document.name}</p><p className="mt-1 text-sm text-slate-600">{document.contentType.includes('pdf') ? 'PDF' : 'CSV'} · {document.available ? 'Disponible' : document.dueAt ? `Indisponible jusqu’au ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : 'Réservation prioritaire en cours'} · {document.waitingReservations} réservation(s) en attente</p></div>
            {!staff && <button type="button" disabled={document.available || documentId === document.id || Boolean(existingReservation)} onClick={() => void reserveDocument(document.id)} className="shrink-0 rounded-md border border-green-800 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500">{existingReservation ? existingReservation.status === 'READY_FOR_PICKUP' ? 'Disponible pour vous' : 'Déjà réservé' : document.available ? 'Disponible dans Prêts' : documentId === document.id ? 'Envoi…' : 'Réserver'}</button>}
          </div>
        })}
      </div>
    </section>

    <section className="mt-6" aria-labelledby="digital-reservation-history">
      <h2 id="digital-reservation-history" className="mb-3 text-xl font-bold">Réservations de catalogues numériques</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left"><thead className="bg-slate-100 text-sm text-slate-700"><tr><th className="p-3">Document</th>{staff && <th className="p-3">Usager</th>}<th className="p-3">Statut</th><th className="p-3">Demandé le</th><th className="p-3">Action</th></tr></thead><tbody>
        {documentReservations.map(item => <tr key={item.id} className="border-t border-slate-200"><td className="p-3 font-medium">{item.catalogDocumentName}</td>{staff && <td className="p-3">{item.userName}</td>}<td className="p-3">{item.status === 'WAITING' ? 'En attente' : item.status === 'READY_FOR_PICKUP' ? 'Disponible' : item.status === 'CANCELED' ? 'Annulée' : 'Expirée'}</td><td className="whitespace-nowrap p-3">{new Date(item.reservedAt).toLocaleDateString('fr-FR')}</td><td className="p-3"><div className="flex flex-wrap gap-3">{staff && item.status === 'WAITING' && <button type="button" onClick={() => void readyDocument(item.id)} className="text-sm font-medium text-green-800 hover:underline">Rendre disponible</button>}{!staff && item.status === 'WAITING' && item.userId === user?.id && <button type="button" onClick={() => void cancelDocument(item.id)} className="text-sm font-medium text-red-700 hover:underline">Annuler</button>}{!staff && item.status === 'READY_FOR_PICKUP' && item.userId === user?.id && <button type="button" onClick={() => void downloadDocument(item.catalogDocumentId, item.catalogDocumentName)} className="text-sm font-medium text-green-800 hover:underline">Télécharger</button>}</div></td></tr>)}
        {!loading && documentReservations.length === 0 && <tr><td colSpan={staff ? 5 : 4} className="p-7 text-center text-slate-600">Aucune réservation de catalogue numérique.</td></tr>}
        {loading && <tr><td colSpan={staff ? 5 : 4} className="p-7 text-center text-slate-600">Chargement…</td></tr>}
      </tbody></table></div>
    </section>

    {!staff && <div className="mt-5 flex gap-3 rounded-xl bg-white p-4 shadow"><select value={bookId} onChange={e => setBookId(e.target.value)} className="flex-1 rounded border p-2"><option value="">Choisir un ouvrage</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select><button onClick={() => void reserve()} className="rounded bg-green-700 px-4 text-white">Réserver</button></div>}
    {message && <p role="status" className="mt-4 rounded bg-white p-3 shadow">{message}</p>}
    <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow"><table className="min-w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3">Ouvrage</th><th className="p-3">Statut</th><th className="p-3">Date</th>{staff && <th className="p-3">Action</th>}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-3">{books.find(b => b.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</td><td className="p-3">{item.status}</td><td className="p-3">{new Date(item.reservedAt).toLocaleDateString()}</td>{staff && <td className="p-3">{item.status === 'WAITING' && <button onClick={() => void ready(item.id)} className="text-green-700">Rendre disponible</button>}</td>}</tr>)}</tbody></table></div>
  </section>
}
export default Reservations
