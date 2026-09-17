import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { bookService } from '../services/bookService'
import { loanService } from '../services/loanService'
import { useAuth } from '../AuthContext'

type Book = { id: number; title: string }
type User = { id: number; name: string }
type Loan = { id: number; userId: number; bookId: number; status: string; borrowedAt: string; dueAt: string }

const Loans = () => {
  const { user } = useAuth(); const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const [items, setItems] = useState<Loan[]>([]); const [books, setBooks] = useState<Book[]>([]); const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState(''); const [selectedBook, setSelectedBook] = useState(''); const [message, setMessage] = useState('')
  const load = async () => { try { const [loans, bookData] = await Promise.all([loanService.getAll(), bookService.getAll()]); setItems(loans.data as Loan[]); setBooks(bookData.data as Book[]); if (staff) setUsers((await api.get<User[]>('/admin/users')).data) } catch { setMessage('Impossible de charger les prêts.') } }
  useEffect(() => { void load() }, [])
  const create = async () => { if (!selectedUser || !selectedBook) return; try { await loanService.create({ userId: Number(selectedUser), bookId: Number(selectedBook) }); setMessage('Prêt enregistré.'); await load() } catch (error: any) { setMessage(error.response?.data?.message ?? 'Création impossible.') } }
  const returnLoan = async (id: number) => { try { await loanService.returnLoan(String(id)); setMessage('Retour enregistré.'); await load() } catch { setMessage('Retour impossible.') } }
  const extendLoan = async (item: Loan) => {
    const dueAt = new Date(item.dueAt)
    dueAt.setDate(dueAt.getDate() + 14)
    try {
      await loanService.extendLoan(String(item.id), dueAt.toISOString())
      setMessage('Prêt prolongé de 14 jours.')
      await load()
    } catch { setMessage('Prolongation impossible.') }
  }
  return <section className="mx-auto max-w-5xl px-4 py-10 text-slate-900"><h1 className="text-3xl font-bold">{staff ? 'Gestion des prêts' : 'Mes emprunts'}</h1>
    {staff && <div className="mt-5 grid gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-3"><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="rounded border p-2"><option value="">Usager</option>{users.filter((u: any) => u.actif !== false).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select><select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} className="rounded border p-2"><option value="">Ouvrage</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select><button onClick={() => void create()} className="rounded bg-green-700 text-white">Créer le prêt</button></div>}
    {message && <p role="status" className="mt-4 rounded bg-white p-3 shadow">{message}</p>}
    <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow"><table className="min-w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3">Ouvrage</th>{staff && <th className="p-3">Usager</th>}<th className="p-3">Échéance</th><th className="p-3">Statut</th>{staff && <th className="p-3" />}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-3">{books.find(b => b.id === item.bookId)?.title ?? `Livre #${item.bookId}`}</td>{staff && <td className="p-3">{users.find(u => u.id === item.userId)?.name ?? `Usager #${item.userId}`}</td>}<td className="p-3">{new Date(item.dueAt).toLocaleDateString()}</td><td className="p-3">{item.status}</td>{staff && <td className="p-3 flex gap-3">{item.status === 'BORROWED' && <><button onClick={() => void extendLoan(item)} className="text-blue-700">Prolonger</button><button onClick={() => void returnLoan(item.id)} className="text-green-700">Retour</button></>}</td>}</tr>)}</tbody></table></div>
  </section>
}
export default Loans
