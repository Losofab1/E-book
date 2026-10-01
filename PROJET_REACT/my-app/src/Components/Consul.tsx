import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText, FileText, Search } from 'lucide-react'
import { bookService } from '../services/bookService'
import { catalogCirculationService, type CatalogDocument } from '../services/catalogCirculationService'
import { digitalAccessService } from '../services/digitalAccessService'
import type { DigitalAccess } from '../services/types'
import { useAuth } from '../AuthContext'
import Alert from './ui/Alert'
import StatusBadge from './ui/StatusBadge'
import ReaderModal from './ui/ReaderModal'

type Book = { id: number; title: string; author: string; category: string; availableCopies: number }

type BookReader = { kind: 'book'; book: Book; loading: boolean; error: string; access: DigitalAccess | null }

type CatalogReader = {
  kind: 'catalog'
  document: CatalogDocument
  loading: boolean
  error: string
  fullAccess: boolean
  isPdf: boolean
  previewUrl: string | null
  previewText: string | null
  fullUrl: string | null
  fullText: string | null
  fullTextUrl: string | null
}

type Reader = { kind: 'closed' } | BookReader | CatalogReader

const Consul = () => {
  const { user } = useAuth()
  const staff = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const [books, setBooks] = useState<Book[]>([])
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reader, setReader] = useState<Reader>({ kind: 'closed' })

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

  const closeReader = () => {
    setReader((current) => {
      if (current.kind === 'catalog') {
        if (current.previewUrl) URL.revokeObjectURL(current.previewUrl)
        if (current.fullUrl) URL.revokeObjectURL(current.fullUrl)
        if (current.fullTextUrl) URL.revokeObjectURL(current.fullTextUrl)
      }
      return { kind: 'closed' }
    })
  }

  const openBookReader = async (book: Book) => {
    setReader({ kind: 'book', book, loading: true, error: '', access: null })
    try {
      const response = await digitalAccessService.getAccessStatus(book.id)
      setReader({ kind: 'book', book, loading: false, error: '', access: response.data })
    } catch {
      setReader({ kind: 'book', book, loading: false, error: 'Statut de lecture indisponible.', access: null })
    }
  }

  const openCatalogReader = async (document: CatalogDocument) => {
    const isPdf = document.contentType.includes('pdf')
    setReader({
      kind: 'catalog', document, loading: true, error: '', fullAccess: false, isPdf,
      previewUrl: null, previewText: null, fullUrl: null, fullText: null, fullTextUrl: null,
    })
    try {
      const [accessResult, previewResult] = await Promise.allSettled([
        catalogCirculationService.getPublicAccess(document.id),
        catalogCirculationService.fetchPreviewBlob(document.id),
      ])
      if (previewResult.status !== 'fulfilled') throw new Error('preview')
      const full = accessResult.status === 'fulfilled' && accessResult.value.data.fullAccess && user !== null
      let previewUrl: string | null = null
      let previewText: string | null = null
      if (isPdf) {
        previewUrl = URL.createObjectURL(previewResult.value)
      } else {
        previewText = await previewResult.value.text()
      }
      let fullUrl: string | null = null
      let fullText: string | null = null
      let fullTextUrl: string | null = null
      if (full) {
        const blob = await catalogCirculationService.fetchFullBlob(document.id)
        if (isPdf) {
          fullUrl = URL.createObjectURL(blob)
        } else {
          fullText = await blob.text()
          fullTextUrl = URL.createObjectURL(new Blob([fullText], { type: 'text/plain;charset=utf-8' }))
        }
      }
      setReader({
        kind: 'catalog', document, loading: false, error: '', fullAccess: full, isPdf,
        previewUrl, previewText, fullUrl, fullText, fullTextUrl,
      })
    } catch {
      setReader({
        kind: 'catalog', document, loading: false, error: 'Lecture impossible pour ce catalogue.', fullAccess: false, isPdf,
        previewUrl: null, previewText: null, fullUrl: null, fullText: null, fullTextUrl: null,
      })
    }
  }

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
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => void openBookReader(book)} className="btn-outline px-3 py-1.5 text-sm">Lire</button>
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
                          {` · ${document.totalCopies ?? 10} ex. · ${document.availableCopies ?? (document.available ? document.totalCopies ?? 10 : 0)} disponible(s)`}
                          {!document.available && document.dueAt ? ` · Retour le ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : ''}
                          {` · ${document.waitingReservations} réservation(s) en attente`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {document.available
                        ? <StatusBadge label="Disponible" variant="success" />
                        : <StatusBadge label="Emprunté" variant="warning" />}
                      <button type="button" onClick={() => void openCatalogReader(document)} className="btn-outline px-3 py-1.5 text-sm">Lire</button>
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

      {reader.kind === 'book' && (
        <ReaderModal
          title={reader.book.title}
          badgeLabel={reader.loading ? 'Chargement…' : reader.access?.fullAccess ? 'Lecture intégrale' : 'Aperçu'}
          badgeVariant={reader.access?.fullAccess ? 'success' : 'warning'}
          notice={reader.access && !reader.access.fullAccess
            ? 'Sans emprunt en cours, seule la fiche ouvrage est visible. Empruntez-le pour la lecture intégrale.'
            : undefined}
          onClose={closeReader}
          actions={user
            ? <Link to="/reservations" className="btn-primary">Réserver cet ouvrage</Link>
            : <Link to="/login" className="btn-primary">Se connecter</Link>}
        >
          {reader.loading && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>}
          {!reader.loading && reader.error && <Alert variant="error">{reader.error}</Alert>}
          {!reader.loading && !reader.error && reader.access && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="card"><dt className="text-slate-600">Auteur</dt><dd className="mt-1 font-semibold">{reader.book.author}</dd></div>
              <div className="card"><dt className="text-slate-600">Catégorie</dt><dd className="mt-1 font-semibold">{reader.book.category}</dd></div>
              <div className="card"><dt className="text-slate-600">Disponibilité</dt><dd className="mt-1 font-semibold">{reader.book.availableCopies} exemplaire(s)</dd></div>
              <div className="card"><dt className="text-slate-600">Statut d’accès</dt><dd className="mt-1 font-semibold">{reader.access.message}</dd></div>
            </dl>
          )}
        </ReaderModal>
      )}

      {reader.kind === 'catalog' && (
        <ReaderModal
          title={reader.document.name}
          badgeLabel={reader.loading ? 'Chargement…' : reader.fullAccess && (reader.fullUrl || reader.fullText) ? 'Lecture intégrale' : 'Aperçu — première page'}
          badgeVariant={reader.fullAccess && (reader.fullUrl || reader.fullText) ? 'success' : 'warning'}
          notice={!reader.loading && !reader.fullAccess
            ? (user
              ? 'Sans emprunt en cours ni réservation disponible, seule la première page est visible.'
              : 'Connectez-vous et empruntez ce catalogue pour lire l’intégralité.')
            : undefined}
          onClose={closeReader}
          actions={<>
            {!reader.loading && !reader.fullAccess && (user
              ? <Link to={reader.document.available ? '/loans' : '/reservations'} className="btn-primary">
                  {reader.document.available ? 'Emprunter' : 'Réserver'}
                </Link>
              : <Link to="/login" className="btn-primary">Se connecter</Link>)}
            {!reader.loading && reader.fullUrl && staff && (
              <a href={reader.fullUrl} download={reader.document.name} className="btn-outline">Télécharger</a>
            )}
            {!reader.loading && reader.fullTextUrl && staff && (
              <a href={reader.fullTextUrl} download={reader.document.name} className="btn-outline">
                Télécharger
              </a>
            )}
          </>}
        >
          {reader.loading && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>}
          {!reader.loading && reader.error && <Alert variant="error">{reader.error}</Alert>}
          {!reader.loading && !reader.error && reader.isPdf && (
            <iframe
              title={`Aperçu de ${reader.document.name}`}
              src={reader.fullUrl ?? reader.previewUrl ?? ''}
              className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
            />
          )}
          {!reader.loading && !reader.error && !reader.isPdf && (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              {reader.fullText ?? reader.previewText ?? ''}
            </pre>
          )}
        </ReaderModal>
      )}
    </section>
  )
}
export default Consul
