import { useEffect, useState } from 'react'
import { bookService } from '../services/bookService'

type Book = { id: number; title: string; author: string; category: string; availableCopies: number }

const Consul = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState('')
  useEffect(() => { bookService.getAll().then(response => setBooks(response.data as Book[])).catch(() => setError('Catalogue indisponible. Réessayez plus tard.')) }, [])
  return <section className="mx-auto max-w-6xl px-4 py-10 text-slate-900"><h1 className="text-3xl font-bold">Consulter le catalogue</h1><p className="mt-2 text-slate-600">Catalogue synchronisé avec le serveur.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map(book => <article key={book.id} className="rounded-xl bg-white p-5 shadow"><h2 className="font-bold">{book.title}</h2><p>{book.author}</p><p className="mt-2 text-sm text-slate-600">{book.category} · {book.availableCopies} disponible(s)</p></article>)}</div></section>
}
export default Consul
