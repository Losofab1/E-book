import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText, FileText, Search } from 'lucide-react'
import { bookService } from '../services/bookService'
import { catalogCirculationService, type CatalogDocument } from '../services/catalogCirculationService'
import { useAuth } from '../AuthContext'
import Alert from './ui/Alert'
import StatusBadge from './ui/StatusBadge'

type Book = { id: number; title: string; author: string; category: string; availableCopies: number }

const Consul = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [bookResult, documentResult] = await Promise.allSettled([
        bookService.getPublic(),
        catalogCirculationService.getPublicDocuments(),
      ])
      if (cancelled) return
      if (bookResult.status === 'fulfilled' && Array.isArray(bookResult.value.data)) {
        setBooks(bookResult.value.data as Book[])
      } else {
        setError('Catalogue indisponible. Réessayez plus tard.')
      }
      if (documentResult.status === 'fulfilled' && Array.isArray(documentResult.value.data)) {
        setDocuments(documentResult.value.data)
      }
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const term = search.trim().toLocaleLowerCase('fr')
  const filteredBooks = useMemo(() => {
    if (!term) return books
    return books.filter((book) =>
      [book.title, book.author, book.category].some((value) => value?.toLocaleLowerCase('fr').includes(term)),
    )
  }, [books, term])
  const filteredDocuments = useMemo(() => {
    if (!term) return documents
    return documents.filter((document) => document.name.toLocaleLowerCase('fr').includes(term))
  }, [documents, term])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-primary-700 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BookOpenText size={34} strokeWidth={1.5} />
            <div>
              <h1 className="text-3xl font-bold">Consulter le catalogue</h1>
              <p className="mt-1 text-green-50">Ouvrages et catalogues numériques, en accès libre.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/15 px-5 py-3 text-center" aria-label={`${books.length} ouvrage(s) au catalogue`}>
              <p className="text-3xl font-bold">{loading ? '...' : books.length}</p>
              <p className="text-sm text-green-50">ouvrages</p>
            </div>
            <div className="rounded-xl bg-white/15 px-5 py-3 text-center" aria-label={`${documents.length} catalogue(s) numérique(s)`}>
              <p className="text-3xl font-bold">{loading ? '...' : documents.length}</p>
              <p className="text-sm text-green-50">catalogues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un titre, un auteur, une catégorie, un catalogue…"
            aria-label="Rechercher dans le catalogue"
            className="input pl-10"
          />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {loading && <p className="mt-8 text-center text-slate-600">Chargement du catalogue...</p>}

      {!loading && !error && (
        <>
          <h2 className="mb-3 mt-8 text-xl font-bold">Ouvrages ({filteredBooks.length})</h2>
          {filteredBooks.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow">Aucun ouvrage disponible pour le moment.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((book) => (
                <article key={book.id} className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <BookOpenText className="shrink-0 text-primary-700" size={28} strokeWidth={1.5} />
                    {book.availableCopies > 0
                      ? <StatusBadge label="Disponible" variant="success" />
                      : <StatusBadge label="Indisponible" variant="danger" />}
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">{book.title}</h3>
                  <p className="mt-2 text-slate-700">{book.author}</p>
                  <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">{book.category} · {book.availableCopies} disponible(s)</p>
                  <div className="mt-4">
                    {user
                      ? <Link to="/reservations" className="text-sm font-semibold text-primary-800 hover:underline">Réserver cet ouvrage</Link>
                      : <Link to="/login" className="text-sm font-semibold text-primary-800 hover:underline">Se connecter pour réserver</Link>}
                  </div>
                </article>
              ))}
            </div>
          )}

          <h2 className="mb-3 mt-10 text-xl font-bold">Catalogues numériques ({filteredDocuments.length})</h2>
          {filteredDocuments.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow">Aucun catalogue importé pour le moment.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
              <ul className="divide-y divide-slate-200">
                {filteredDocuments.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="shrink-0 text-primary-700" size={26} strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{document.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {document.contentType.includes('pdf') ? 'PDF' : 'CSV'}
                          {!document.available && document.dueAt ? ` · Retour le ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : ''}
                          {` · ${document.waitingReservations} réservation(s) en attente`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {document.available
                        ? <StatusBadge label="Disponible" variant="success" />
                        : <StatusBadge label="Emprunté" variant="warning" />}
                      {user
                        ? <Link to={document.available ? '/loans' : '/reservations'} className="text-sm font-semibold text-primary-800 hover:underline">
                            {document.available ? 'Emprunter' : 'Réserver'}
                          </Link>
                        : <Link to="/login" className="text-sm font-semibold text-primary-800 hover:underline">Se connecter pour emprunter</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
export default Consul
