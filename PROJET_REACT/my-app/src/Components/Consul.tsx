import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText, FileText, Search } from 'lucide-react'
import { bookService } from '../services/bookService'
import { apiBaseUrl } from '../services/api'
import { catalogCirculationService, type CatalogDocument } from '../services/catalogCirculationService'
import { digitalAccessService } from '../services/digitalAccessService'
import type { DigitalAccess } from '../services/types'
import { useAuth } from '../AuthContext'
import Alert from './ui/Alert'
import StatusBadge from './ui/StatusBadge'
import ReaderModal from './ui/ReaderModal'
import ShowMoreButton from './ui/ShowMoreButton'
import ErrorBoundary from './ui/ErrorBoundary'
import CatalogCsvReader from './ui/CatalogCsvReader'

/** Réessaie une requête réseau avec délais croissants (coupures mobiles brèves). */
async function withRetry<T>(fn: () => Promise<T>, delays: number[] = [600, 1200]): Promise<T> {
  let remaining = delays
  for (;;) {
    try {
      return await fn()
    } catch (error) {
      const [wait, ...rest] = remaining
      if (wait === undefined) throw error
      await new Promise((resolve) => setTimeout(resolve, wait))
      remaining = rest
    }
  }
}

/** Recharge le lecteur PDF : 3 essais avec délais croissants (réseau mobile instable). */
function lazyPdfReader() {
  const delays = [1500, 3000]
  return lazy(() => new Promise<{ default: typeof import('./ui/CatalogPdfReader').default }>((resolve, reject) => {
    const attempt = (left: number[]) => {
      import('./ui/CatalogPdfReader').then(resolve).catch(() => {
        const [wait, ...rest] = left
        if (wait === undefined) {
          reject(new Error('pdf-reader-chunk'))
          return
        }
        setTimeout(() => attempt(rest), wait)
      })
    }
    attempt(delays)
  }))
}

/** Afficheur PDF natif du navigateur : repli silencieux quand le lecteur
 * avancé ne peut pas se charger. Le catalogue s'affiche quand même.
 * Adhérents : sandbox sans allow-downloads, pas de téléchargement proposé. */
const NativePdfViewer = ({ url, title, allowDownload = false }: { url: string; title: string; allowDownload?: boolean }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <iframe
      src={url}
      title={title}
      className="h-[62dvh] w-full sm:h-[68vh]"
      sandbox={allowDownload ? undefined : 'allow-same-origin allow-scripts'}
    />
  </div>
)

/** Précharge le lecteur PDF quand le navigateur est inactif. */
const warmPdfReader = () => {
  void import('./ui/CatalogPdfReader').catch(() => undefined)
}

type Book = { id: number; title: string; author: string; category: string; availableCopies: number }

type BookReader = { kind: 'book'; book: Book; loading: boolean; error: string; access: DigitalAccess | null }

type CatalogReader = {
  kind: 'catalog'
  document: CatalogDocument
  loading: boolean
  error: string
  fullAccess: boolean
  fullLoading: boolean
  fullError: boolean
  /** 0..1 : progression du téléchargement intégral (utile sur mobile). */
  fullProgress: number | null
  /** Streaming HTTP direct (Range) : les pages arrivent à la demande. */
  fullStreamUrl: string | null
  streamFailed: boolean
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
  // Lecteur PDF en chargement différé : recréé à chaque ouverture car
  // React mémorise un import rejeté et le rejoue en échec sans retélécharger.
  const [PdfReader, setPdfReader] = useState(() => lazyPdfReader())
  // Bouton « Lire » en cours d'ouverture (spinner dessus, double-tap bloqué).
  const [openingCatalogId, setOpeningCatalogId] = useState<number | null>(null)
  const [openingBookId, setOpeningBookId] = useState<number | null>(null)
  const readerSession = useRef(0)
  const pdfPrefetched = useRef(false)
  // Aperçu courant : permet de relancer la version intégrale sans tout recharger.
  const catalogPreview = useRef<{ document: CatalogDocument; isPdf: boolean; previewUrl: string | null; previewText: string | null; streamFailed: boolean } | null>(null)
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

  // Précharge le lecteur PDF quand le navigateur est inactif : le tap
  // sur « Lire » trouve le code déjà en cache, même sur téléphone.
  // Sauf mode économiseur de données.
  useEffect(() => {
    if (loading || pdfPrefetched.current) return
    const hasPdf = documents.some((d) => (d.contentType ?? '').toLowerCase().includes('pdf')
      || (d.name ?? '').toLowerCase().endsWith('.pdf'))
    if (!hasPdf) return
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (saveData) return
    pdfPrefetched.current = true
    const prefetch = () => warmPdfReader()
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(prefetch, 2500)
    return () => clearTimeout(t)
  }, [loading, documents])

  const closeReader = useCallback(() => {
    readerSession.current += 1
    catalogPreview.current = null
    document.body.style.overflow = ''
    // Retour direct au catalogue : on retire le hash sans toucher à l'historique.
    // window.history.back() renvoyait parfois vers une autre page (Login, Accueil...).
    if (window.location.hash === '#lecture') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setOpeningCatalogId(null)
    setOpeningBookId(null)
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
    if (openingBookId === book.id) return
    const session = ++readerSession.current
    pushReaderHistory()
    setOpeningBookId(book.id)
    setReader({ kind: 'book', book, loading: true, error: '', access: null })
    try {
      const response = await withRetry(() => digitalAccessService.getAccessStatus(book.id), [600, 1200, 2400])
      if (readerSession.current !== session) return
      setOpeningBookId(null)
      setReader({ kind: 'book', book, loading: false, error: '', access: response.data })
    } catch {
      if (readerSession.current !== session) return
      setOpeningBookId(null)
      // Pas d'écran d'erreur : la fiche reste consultable sans le statut d'accès.
      setReader({ kind: 'book', book, loading: false, error: '', access: null })
    }
  }

  // Charge la version intégrale après l'aperçu.
  // PDF : streaming HTTP direct (Range) — seules les pages lues transitent,
  // la première page intégrale s'affiche sans attendre les 25 Mo. Le
  // téléchargement complet (blob) ne sert que de repli si le stream échoue.
  // En cas d'échec, fullError passe à vrai et un bouton de relance apparaît.
  const loadFullCatalog = async (session?: number) => {
    const snap = catalogPreview.current
    if (!snap) return
    const currentSession = session ?? readerSession.current
    if (readerSession.current !== currentSession) return
    if (snap.isPdf && !snap.streamFailed) {
      setReader((current) => current.kind === 'catalog' && current.document.id === snap.document.id
        ? {
          ...current,
          fullLoading: true,
          fullError: false,
          fullProgress: 0,
          fullStreamUrl: `${apiBaseUrl}/catalogs/${snap.document.id}/content`,
          streamFailed: false,
        }
        : current)
      return
    }
    setReader((current) => current.kind === 'catalog' && current.document.id === snap.document.id
      ? { ...current, fullLoading: true, fullError: false, fullProgress: 0 }
      : current)
    try {
      const blob = await withRetry(() => catalogCirculationService.fetchFullBlob(
        snap.document.id,
        (ratio) => {
          if (readerSession.current !== currentSession) return
          setReader((current) => current.kind === 'catalog' && current.document.id === snap.document.id
            ? { ...current, fullProgress: Math.round(ratio * 100) / 100 }
            : current)
        },
      ), [600, 1200, 2400, 4800])
      let fullUrl: string | null = null
      let fullText: string | null = null
      let fullTextUrl: string | null = null
      if (snap.isPdf) {
        fullUrl = URL.createObjectURL(blob)
      } else {
        fullText = await blob.text()
        fullTextUrl = URL.createObjectURL(new Blob([fullText], { type: 'text/plain;charset=utf-8' }))
      }
      if (readerSession.current !== currentSession) {
        if (fullUrl) URL.revokeObjectURL(fullUrl)
        if (fullTextUrl) URL.revokeObjectURL(fullTextUrl)
        return
      }
      setReader((current) => current.kind === 'catalog' && current.document.id === snap.document.id
        ? { ...current, fullLoading: false, fullError: false, fullProgress: 1, fullUrl, fullText, fullTextUrl }
        : current)
    } catch {
      if (readerSession.current !== currentSession) return
      setReader((current) => current.kind === 'catalog'
        ? { ...current, fullLoading: false, fullError: true }
        : current)
    }
  }

  const retryFullCatalog = () => {
    const snap = catalogPreview.current
    if (snap) snap.streamFailed = false
    setReader((current) => current.kind === 'catalog'
      ? { ...current, fullStreamUrl: null, streamFailed: false, fullError: false }
      : current)
    void loadFullCatalog()
  }

  const handleStreamProgress = (documentId: number, ratio: number) => {
    if (catalogPreview.current?.document.id !== documentId) return
    setReader((current) => current.kind === 'catalog' && current.document.id === documentId
      ? { ...current, fullProgress: Math.round(ratio * 100) / 100 }
      : current)
  }

  const handleStreamReady = (documentId: number) => {
    if (catalogPreview.current?.document.id !== documentId) return
    setReader((current) => current.kind === 'catalog' && current.document.id === documentId
      ? { ...current, fullLoading: false, fullError: false, fullProgress: 1 }
      : current)
  }

  // Le streaming a échoué : repli sur le téléchargement complet (blob).
  const handleStreamFailed = (documentId: number) => {
    const snap = catalogPreview.current
    if (!snap || snap.document.id !== documentId || snap.streamFailed) return
    snap.streamFailed = true
    setReader((current) => current.kind === 'catalog' && current.document.id === documentId
      ? { ...current, fullStreamUrl: null, streamFailed: true }
      : current)
    void loadFullCatalog()
  }

  const openCatalogReader = async (document: CatalogDocument) => {
    if (openingCatalogId === document.id) return
    const session = ++readerSession.current
    pushReaderHistory()
    setPdfReader(lazyPdfReader())
    setOpeningCatalogId(document.id)
    catalogPreview.current = null
    const isPdf = (document.contentType ?? '').toLowerCase().includes('pdf')
      || (document.name ?? '').toLowerCase().endsWith('.pdf')
    const baseReader = {
      kind: 'catalog' as const,
      document,
      error: '',
      fullAccess: false,
      fullLoading: false,
      fullError: false,
      fullProgress: null,
      fullStreamUrl: null,
      streamFailed: false,
      isPdf,
      previewUrl: null as string | null,
      previewText: null as string | null,
      fullUrl: null as string | null,
      fullText: null as string | null,
      fullTextUrl: null as string | null,
    }
    setReader({ ...baseReader, loading: true })
    const isStale = () => readerSession.current !== session
    try {
      // Aperçu + droits avec réessais : un trou réseau ne doit plus casser l'ouverture.
      const [accessResult, previewResult] = await Promise.allSettled([
        withRetry(() => catalogCirculationService.getPublicAccess(document.id), [600, 1200, 2400]),
        withRetry(() => catalogCirculationService.fetchPreviewBlob(document.id), [600, 1200, 2400]),
      ])
      if (previewResult.status !== 'fulfilled') throw new Error('preview')
      let previewUrl: string | null = null
      let previewText: string | null = null
      if (isPdf) {
        previewUrl = URL.createObjectURL(previewResult.value)
      } else {
        previewText = await previewResult.value.text()
      }
      if (isStale()) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        return
      }
      const entitled = accessResult.status === 'fulfilled' && accessResult.value.data.fullAccess && user !== null
      catalogPreview.current = { document, isPdf, previewUrl, previewText, streamFailed: false }
      // L'aperçu est lisible : le bouton « Lire » redevient normal,
      // l'intégrale continue en arrière-plan.
      setOpeningCatalogId(null)
      setReader({ ...baseReader, loading: false, fullAccess: entitled, fullLoading: entitled, fullError: false, fullProgress: entitled ? 0 : null, fullStreamUrl: null, streamFailed: false, previewUrl, previewText })
      if (!entitled) return
      await loadFullCatalog(session)
    } catch {
      if (isStale()) return
      // Échec persistant : pas d'écran d'erreur. On referme proprement,
      // le bouton « Lire » redevient normal pour un nouvel essai plus tard.
      setOpeningCatalogId(null)
      catalogPreview.current = null
      if (window.location.hash === '#lecture') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      setReader({ kind: 'closed' })
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
                    <button
                      type="button"
                      onClick={() => void openBookReader(book)}
                      disabled={openingBookId === book.id}
                      className="btn-outline px-3 py-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
                    >
                      {openingBookId === book.id ? 'Ouverture…' : 'Lire'}
                    </button>
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
                      <button
                        type="button"
                        onClick={() => void openCatalogReader(document)}
                        disabled={openingCatalogId === document.id}
                        className="btn-outline min-h-[44px] flex-1 px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60 sm:flex-none"
                      >
                        {openingCatalogId === document.id ? 'Ouverture…' : 'Lire'}
                      </button>
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
          notice={!reader.loading && !reader.access
            ? 'Statut d’accès momentanément indisponible — la fiche reste consultable.'
            : reader.access && !reader.access.fullAccess
              ? 'Sans emprunt en cours, seule la fiche ouvrage est visible. Empruntez-le pour la lecture intégrale.'
              : undefined}
          onClose={closeReader}
          actions={<>
            {user
              ? <Link to="/reservations" className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">Réserver cet ouvrage</Link>
              : <Link to="/login" className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">Se connecter</Link>}
          </>}
        >
          {reader.loading && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement…</p>}
          {!reader.loading && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="card"><dt className="text-slate-600">Auteur</dt><dd className="mt-1 font-semibold">{reader.book.author}</dd></div>
              <div className="card"><dt className="text-slate-600">Catégorie</dt><dd className="mt-1 font-semibold">{reader.book.category}</dd></div>
              <div className="card"><dt className="text-slate-600">Disponibilité</dt><dd className="mt-1 font-semibold">{reader.book.availableCopies} exemplaire(s)</dd></div>
              {reader.access && <div className="card"><dt className="text-slate-600">Statut d’accès</dt><dd className="mt-1 font-semibold">{reader.access.message}</dd></div>}
            </dl>
          )}
        </ReaderModal>
      )}

      {reader.kind === 'catalog' && (
        <ReaderModal
          title={reader.document.name}
          badgeLabel={reader.loading
            ? 'Chargement…'
            : (reader.fullUrl ?? reader.fullText) != null
              || (reader.fullStreamUrl != null && !reader.fullLoading && !reader.fullError)
              ? 'Lecture intégrale'
              : reader.fullAccess ? 'Aperçu — intégrale en cours' : 'Aperçu — première page'}
          badgeVariant={reader.loading
            ? 'warning'
            : (reader.fullUrl ?? reader.fullText) != null
              || (reader.fullStreamUrl != null && !reader.fullLoading && !reader.fullError)
              ? 'success' : 'warning'}
          notice={!reader.loading && reader.fullError
            ? 'La version intégrale n’a pas pu charger (prêt actif requis, réseau instable). L’aperçu reste visible — relancez le chargement.'
            : !reader.loading && reader.fullLoading
              ? (reader.fullProgress !== null && reader.fullProgress > 0
                ? `Version intégrale en cours de chargement — ${Math.round(reader.fullProgress * 100)} % (toutes les pages arrivent).`
                : 'Aperçu affiché — la version intégrale (toutes les pages) charge en arrière-plan.')
              : !reader.loading && !reader.fullAccess
                ? (user
                  ? 'Sans emprunt en cours ni réservation disponible, seule la première page est visible.'
                  : 'Connectez-vous et empruntez ce catalogue pour lire l’intégralité.')
                : undefined}
          onClose={closeReader}
          actions={<>
            {!reader.loading && reader.fullError && (
              <button type="button" onClick={retryFullCatalog} className="btn-primary min-h-[44px] w-full text-sm sm:w-auto">
                Recharger la version intégrale
              </button>
            )}
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
          {!reader.loading && (
            <ErrorBoundary
              key={`catalog-${reader.document.id}`}
              resetKey={`catalog-${reader.document.id}`}
              fallback={(() => {
                const nativeUrl = reader.fullUrl ?? reader.previewUrl ?? ''
                return nativeUrl ? <NativePdfViewer url={nativeUrl} title={reader.document.name} allowDownload={staff} /> : null
              })()}
            >
              {reader.isPdf ? (
                <Suspense fallback={<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chargement du lecteur PDF…</p>}>
                  <PdfReader
                    url={reader.fullUrl ?? reader.previewUrl ?? ''}
                    title={reader.document.name}
                    allowDownload={staff}
                    progress={reader.fullLoading ? reader.fullProgress : null}
                    streamUrl={reader.fullStreamUrl}
                    streamHeaders={(() => {
                      const token = localStorage.getItem('jwt_token')
                      return token ? { Authorization: `Bearer ${token}` } : {}
                    })()}
                    onStreamProgress={(ratio) => handleStreamProgress(reader.document.id, ratio)}
                    onStreamReady={() => handleStreamReady(reader.document.id)}
                    onStreamFailed={() => handleStreamFailed(reader.document.id)}
                  />
                </Suspense>
              ) : (
                <CatalogCsvReader text={reader.fullText ?? reader.previewText ?? ''} title={reader.document.name} />
              )}
            </ErrorBoundary>
          )}
        </ReaderModal>
      )}
    </section>
  )
}
export default Consul
