import { useEffect, useState } from 'react'
import { bookService } from '../services/bookService'
import { reservationService } from '../services/reservationService'
import { useAuth } from '../AuthContext'

type Book = { id: number; title: string }
type Reservation = { id: number; bookId: number; userId: number; status: string; reservedAt: string }

const Reservations = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [items, setItems] = useState<Reservation[]>([])
  const [bookId, setBookId] = useState('')
  const [message, setMessage] = useState('')
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const reload = async () => {
    try {
      const [bookResponse, reservationResponse] = await Promise.all([bookService.getAll(), reservationService.getAll()])
      setBooks(bookResponse.data as Book[]); setItems(reservationResponse.data as Reservation[])
    } catch { setMessage('Impossible de charger les réservations.') }
  }
  useEffect(() => { void reload() }, [])
  const reserve = async () => {
    if (!user || !bookId) return
    try { await reservationService.create({ userId: user.id, bookId: Number(bookId) }); setMessage('Réservation enregistrée.'); setBookId(''); await reload() }
    catch (error: any) { setMessage(error.response?.data?.message ?? 'Réservation impossible.') }
  }
  const ready = async (id: number) => { try { await reservationService.ready(id); setMessage('Réservation disponible pour retrait.'); await reload() } catch { setMessage('Opération impossible.') } }
  return <section className="mx-auto max-w-5xl px-4 py-10 text-slate-900"><h1 className="text-3xl font-bold">Réservations</h1>
    {!staff && <div className="mt-5 flex gap-3 rounded-xl bg-white p-4 shadow"><select value={bookId} onChange={e => setBookId(e.target.value)} className="flex-1 rounded border p-2"><option value="">Choisir un ouvrage</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select><button onClick={() => void reserve()} className="rounded bg-green-700 px-4 text-white">Réserver</button></div>}
    {message && <p role="status" className="mt-4 rounded bg-white p-3 shadow">{message}</p>}
    <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow"><table className="min-w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3">Ouvrage</th><th className="p-3">Statut</th><th className="p-3">Date</th>{staff && <th className="p-3">Action</th>}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-3">{books.find(b => b.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</td><td className="p-3">{item.status}</td><td className="p-3">{new Date(item.reservedAt).toLocaleDateString()}</td>{staff && <td className="p-3">{item.status === 'WAITING' && <button onClick={() => void ready(item.id)} className="text-green-700">Rendre disponible</button>}</td>}</tr>)}</tbody></table></div>
  </section>
}
export default Reservations
