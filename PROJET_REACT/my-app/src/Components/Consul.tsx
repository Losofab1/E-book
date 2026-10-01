import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import ShowMoreButton from './ui/ShowMoreButton'
import CatalogCsvReader from './ui/CatalogCsvReader'

const CatalogPdfReader = lazy(() => import('./ui/CatalogPdfReader'))

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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAllBooks, setShowAllBooks] = useState(false)
  const [showAllDocuments, setShowAllDocuments] = useState(false)
  const [reader, setReader] = useState<Reader>({ kind: 'closed' })
  const readerSession = useRef(0)
  const PREVIEW_SIZE = 10

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

  const closeReader = useCallback(() => {
    readerSession.current += 1
    document.body.style.overflow = ''
    if (window.location.hash === '#lecture') {
      window.history.back()
    }
    setReader((current) => {
      if (current.kind === 'catalog') {
        if (current.previewUrl) URL.revokeObjectURL(current.previewUrl)
        if (current.fullUrl) URL.revokeObjectURL(current.fullUrl)
        if (current.fullTextUrl) URL.revokeObjectURL(current.fullTextUrl)
      }
      return { kind: 'closed' }
    })
  }, [])

  useEffect(() => {
    if (window.location.hash === '#lecture') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    const onHashChange = () => {
      if (window.location.hash !== '#lecture') closeReader()
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [closeReader])

  const pushReaderHistory = () => {
    if (window.location.hash !== '#lecture') {
      window.history.pushState(null, '', '#lecture')
    }
  }

  const term = debouncedSearch.trim().toLocaleLowerCase('fr')
  const filteredBooks = useMemo(() => {
    if (!term) return books
    return books.filter((book) =>
      [book.title, book.author, book.category].some((value) => value?.toLocaleLowerCase('fr').includes(term)),
    )
  }, [books, term])
  const filteredDocuments = useMemo(() => {
    if (!term) return documents
    return documents.filter((document) => (document.name ?? '').toLocaleLowerCase('fr').includes(term))
  }, [documents, term])
  const visibleBooks = showAllBooks ? filteredBooks : filteredBooks.slice(0, PREVIEW_SIZE)
  const visibleDocuments = showAllDocuments ? filteredDocuments : filteredDocuments.slice(0, PREVIEW_SIZE)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setShowAllBooks(false)
      setShowAllDocuments(false)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const openBookReader = async (book: Book) => {
    const session = ++readerSession.current
    pushReaderHistory()
    setReader({ kind: 'book', book, loading: true, error: '', access: null })
    try {
      const response = await digitalAccessService.getAccessStatus(book.id)
      if (readerSession.current !== session) return
      setReader({ kind: 'book', book, loading: false, error: '', access: response.data })
    } catch {
      if (readerSession.current !== session) return
      setReader({ kind: 'book', book, loading: false, error: 'Statut de lecture indisponible.', access: null })
    }
  }

  const openCatalogReader = async (document: CatalogDocument) => {
    const session = ++readerSession.current
    pushReaderHistory()
    const isPdf = (document.contentType ?? '').toLowerCase().includes('pdf')
      || (document.name ?? '').toLowerCase().endsWith('.pdf')
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
      if (readerSession.current !== session) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        if (fullUrl) URL.revokeObjectURL(fullUrl)
        if (fullTextUrl) URL.revokeObjectURL(fullTextUrl)
        return
      }
      setReader({
        kind: 'catalog', document, loading: false, error: '', fullAccess: full, isPdf,
        previewUrl, previewText, fullUrl, fullText, fullTextUrl,
      })
    } catch {
      if (readerSession.current !== session) return
      setReader({
        kind: 'catalog', document, loading: false, error: 'Lecture impossible pour ce catalogue.', fullAccess: false, isPdf,
        previewUrl: null, previewText: null, fullUrl: null, fullText: null, fullTextUrl: null,
      })
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-6 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="rounded-2xl bg-primary-700 px-4 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center gap-3">
            <BookOpenText size={30} strokeWidth={1.5} className="shrink-0 sm:hidden" />
            <BookOpenText size={34} strokeWidth={1.5} className="hidden shrink-0 sm:block" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Consulter le catalogue</h1>
              <p className="mt-1 text-sm text-green-50 sm:text-base">Ouvrages et catalogues numériques, en accès libre.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-white/15 px-4 py-2.5 text-center sm:flex-none sm:px-5 sm:py-3" aria-label={`${books.length} ouvrage(s) au catalogue`}>
              <p className="text-2xl font-bold sm:text-3xl">{loading ? '...' : books.length}</p>
              <p className="text-xs text-green-50 sm:text-sm">ouvrages</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/15 px-4 py-2.5 text-center sm:flex-none sm:px-5 sm:py-3" aria-label={`${documents.length} catalogue(s) numérique(s)`}>
              <p className="text-2xl font-bold sm:text-3xl">{loading ? '...' : documents.length}</p>
              <p className="text-xs text-green-50 sm:text-sm">catalogues</p>
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
            className="input pl-10 text-[16px]"
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
            <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleBooks.map((book) => (
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
            {filteredBooks.length > PREVIEW_SIZE && (
              <ShowMoreButton showAll={showAllBooks} onToggle={() => setShowAllBooks((current) => !current)} />
            )}
            </>
          )}

          <h2 className="mb-3 mt-10 text-xl font-bold">Catalogues numériques ({filteredDocuments.length})</h2>
          {filteredDocuments.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow">Aucun catalogue importé pour le moment.</p>
          ) : (
            <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
              <ul className="divide-y divide-slate-200">
                {visibleDocuments.map((document) => (
                  <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 shrink-0 text-primary-700" size={26} strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="break-words font-semibold leading-snug">{document.name}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                          {(document.contentType ?? '').toLowerCase().includes('pdf') ? 'PDF' : 'CSV'}
                          {` · ${document.totalCopies ?? 10} ex. · ${document.availableCopies ?? (document.available ? document.totalCopies ?? 10 : 0)} disponible(s)`}
                          {!document.available && document.dueAt ? ` · Retour le ${new Date(document.dueAt).toLocaleDateString('fr-FR')}` : ''}
                          {` · ${document.waitingReservations} réservation(s) en attente`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
                      {document.available
                        ? <StatusBadge label="Disponible" variant="success" />
                        : <StatusBadge label="Emprunté" variant="warning" />}
                      <button type="button" onClick={() => void openCatalogReader(document)} className="btn-outline min-h-[44px] flex-1 px-4 py-2 text-sm sm:flex-none">Lire</button>
                      {user
                        ? <Link to={document.available ? '/loans' : '/reservations'} className="min-h-[44px] py-2 text-sm font-semibold text-primary-800 hover:underline">
                            {document.available ? 'Emprunter' : 'Réserver'}
                          </Link>
                        : <Link to="/login" className="min-h-[44px] py-2 text-sm font-semibold text-primary-800 hover:underline">Se connecter pour emprunter</Link>}
                    </div>
                  </li>
                ))}
              </ul>
              {filteredDocuments.length > PREVIEW_SIZE && (
                <ShowMoreButton showAll={showAllDocuments} onToggle={() => setShowAllDocuments((current) => !current)} />
              )}
            </div>
            </>
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
            ? <Link to="/reservations" className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">Réserver cet ouvrage</Link>
            : <Link to="/login" className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">Se connecter</Link>}
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
              ? <Link to={reader.document.available ? '/loans' : '/reservations'} className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">
                  {reader.document.available ? 'Emprunter' : 'Réserver'}
                </Link>
              : <Link to="/login" className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">Se connecter</Link>)}
            {!reader.loading && reader.fullUrl && staff && (
              <a href={reader.fullUrl} download={reader.document.name} className="btn-outline min-h-[44px] w-full text-sm sm:w-auto">Télécharger</a>
            )}
            {!reader.loading && reader.fullTextUrl && staff && (
              <a href={reader.fullTextUrl} download={reader.document.name} className="btn-outline min-h-[44px] w-full text-sm sm:w-auto">
                Télécharger
              </a>
            )}
          </>}
        >
          {reader.loading && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>}
          {!reader.loading && reader.error && <Alert variant="error">{reader.error}</Alert>}
          {!reader.loading && !reader.error && reader.isPdf && (
            <Suspense fallback={<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement du lecteur PDF…</p>}>
              <CatalogPdfReader url={reader.fullUrl ?? reader.previewUrl ?? ''} title={reader.document.name} />
            </Suspense>
          )}
          {!reader.loading && !reader.error && !reader.isPdf && (
            <CatalogCsvReader text={reader.fullText ?? reader.previewText ?? ''} title={reader.document.name} />
          )}
        </ReaderModal>
      )}
    </section>
  )
}
export default Consul
