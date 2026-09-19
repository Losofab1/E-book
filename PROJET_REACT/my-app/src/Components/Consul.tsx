import { useEffect, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { bookService } from '../services/bookService'

type Book = { id: number; title: string; author: string; category: string; availableCopies: number }

const Consul = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bookService.getAll()
      .then(response => {
        if (!Array.isArray(response.data)) throw new Error('Invalid catalogue response')
        setBooks(response.data as Book[])
      })
      .catch(() => setError('Catalogue indisponible. Réessayez plus tard.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-green-700 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BookOpenText size={34} strokeWidth={1.5} />
            <div>
              <h1 className="text-3xl font-bold">Consulter le catalogue</h1>
              <p className="mt-1 text-green-50">Retrouvez les ouvrages disponibles à la bibliothèque.</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/15 px-5 py-3 text-center" aria-label={`${books.length} ouvrage(s) au catalogue`}>
            <p className="text-3xl font-bold">{loading ? '...' : books.length}</p>
            <p className="text-sm text-green-50">ouvrages au catalogue</p>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}

      {loading && <p className="mt-8 text-center text-slate-600">Chargement du catalogue...</p>}

      {!loading && !error && books.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-600 shadow">Aucun ouvrage disponible pour le moment.</p>
      )}

      {!loading && books.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map(book => (
            <article key={book.id} className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <BookOpenText className="shrink-0 text-green-700" size={28} strokeWidth={1.5} />
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${book.availableCopies > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {book.availableCopies > 0 ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900">{book.title}</h2>
              <p className="mt-2 text-slate-700">{book.author}</p>
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">{book.category} · {book.availableCopies} disponible(s)</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
export default Consul
