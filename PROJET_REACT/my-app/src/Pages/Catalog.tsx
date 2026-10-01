import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { bookService } from '../services/bookService'
import { catalogCirculationService, clearCatalogCache } from '../services/catalogCirculationService'
import { api } from '../services/api'
import { useAuth } from '../AuthContext'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'

type Book = { id: number; title: string; author: string; isbn: string; category: string; availableCopies: number }

type CatalogFile = { id: number; name: string; type: string; uploadedAt?: string; totalCopies?: number }

const bookColumns: TableColumn<Book>[] = [
  { key: 'title', label: 'Titre', render: (book) => <span className="font-semibold">{book.title}</span> },
  { key: 'author', label: 'Auteur' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'category', label: 'Catégorie' },
  { key: 'availableCopies', label: 'Disponibles' },
]

const Catalog = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [message, setMessage] = useState('')
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [documents, setDocuments] = useState<CatalogFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [docPage, setDocPage] = useState(0)
  const [bookPage, setBookPage] = useState(0)
  const PAGE_SIZE = 20
  const canImport = user?.role === 'admin' || user?.role === 'bibliothecaire'
  const MAX_SIZE = 25 * 1024 * 1024
  const loading = loadingBooks || loadingDocs

  const documentColumns: TableColumn<CatalogFile>[] = [
    { key: 'name', label: 'Document', render: (document) => <span className="font-medium">{document.name}</span> },
    {
      key: 'type',
      label: 'Format',
      render: (document) => ((document.type ?? '').toLowerCase().includes('pdf')
        ? <StatusBadge label="PDF" variant="info" />
        : <StatusBadge label="CSV" variant="neutral" />),
    },
    { key: 'copies', label: 'Ex.', render: (document) => <span className="font-medium text-primary-800">{document.totalCopies ?? 10} ex.</span> },
    {
      key: 'uploadedAt',
      label: 'Importé le',
      render: (document) => (document.uploadedAt
        ? <span className="whitespace-nowrap">{new Date(document.uploadedAt).toLocaleDateString('fr-FR')}</span>
        : <span className="text-slate-400">—</span>),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (document) => (
        <button
          type="button"
          onClick={() => void download({ id: document.id, name: document.name })}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-800 hover:underline"
        >
          <Download size={16} />Télécharger
        </button>
      ),
    },
  ]

  const load = useCallback(async () => {
    setLoadingBooks(true)
    setLoadingDocs(true)
    const [bookResult, documentResult] = await Promise.allSettled([bookService.getAll(), api.get<CatalogFile[]>('/catalogs')])
    if (bookResult.status === 'fulfilled' && Array.isArray(bookResult.value.data)) {
      setBooks(bookResult.value.data as Book[])
    }
    if (documentResult.status === 'fulfilled' && Array.isArray(documentResult.value.data)) {
      setDocuments(documentResult.value.data)
    }
    if (bookResult.status === 'rejected' || documentResult.status === 'rejected') {
      const status = documentResult.status === 'rejected' ? (documentResult.reason?.response?.status as number | undefined) : undefined
      setMessage(status === 403
        ? 'Accès réservé au personnel pour la liste des documents.'
        : 'Impossible de charger le catalogue depuis le serveur. Vérifiez que le backend a démarré puis réessayez.')
    } else {
      setMessage('')
    }
    setLoadingBooks(false)
    setLoadingDocs(false)
  }, [])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim().toLocaleLowerCase('fr'))
      setDocPage(0)
      setBookPage(0)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const filteredDocuments = useMemo(() => {
    if (!debouncedSearch) return documents
    return documents.filter((d) => (d.name ?? '').toLocaleLowerCase('fr').includes(debouncedSearch))
  }, [documents, debouncedSearch])
  const filteredBooks = useMemo(() => {
    if (!debouncedSearch) return books
    return books.filter((b) =>
      [b.title, b.author, b.isbn, b.category].some((v) => (v ?? '').toLocaleLowerCase('fr').includes(debouncedSearch)),
    )
  }, [books, debouncedSearch])
  const pagedDocuments = useMemo(
    () => filteredDocuments.slice(docPage * PAGE_SIZE, docPage * PAGE_SIZE + PAGE_SIZE),
    [filteredDocuments, docPage],
  )
  const pagedBooks = useMemo(
    () => filteredBooks.slice(bookPage * PAGE_SIZE, bookPage * PAGE_SIZE + PAGE_SIZE),
    [filteredBooks, bookPage],
  )
  const docPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE))
  const bookPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE))

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0 || uploading) return
    const valid = files.filter(file => /\.(csv|pdf)$/i.test(file.name) && file.size > 0 && file.size <= MAX_SIZE)
    const rejected = files.length - valid.length
    if (valid.length === 0) { setMessage('Seuls les formats CSV et PDF de 1 octet à 25 Mo sont autorisés.'); return }
    setUploading(true)
    setMessage('')
    try {
      if (valid.length === 1) {
        const data = new FormData(); data.append('file', valid[0])
        // Ne pas forcer Content-Type : axios génère la boundary multipart.
        const response = await api.post<{ importedCount: number; message: string }>('/catalogs', data)
        setMessage(`${response.data.message} Les doublons ISBN éventuels sont ignorés.${rejected > 0 ? ` ${rejected} fichier(s) rejeté(s) (format ou taille).` : ''}`)
      } else {
        const data = new FormData(); valid.forEach(file => data.append('files', file))
        const response = await api.post<{ importedDocuments: number; totalImportedBooks: number; message: string }>('/catalogs/batch', data)
        setMessage(`${response.data.message} ${response.data.totalImportedBooks} ouvrage(s) importé(s). Les doublons ISBN sont ignorés.${rejected > 0 ? ` ${rejected} fichier(s) rejeté(s) (format ou taille).` : ''}`)
      }
      await load()
    } catch (error: any) { setMessage(error.response?.data?.message ?? 'Import impossible.') }
    finally { setUploading(false); clearCatalogCache() }
  }

  const download = useCallback(async (document: { id: number; name: string }) => {
    try { await catalogCirculationService.download(document.id, document.name) }
    catch (error: any) {
      const status = error?.response?.status as number | undefined
      setMessage(status === 403
        ? 'Téléchargement réservé : empruntez ce catalogue ou attendez une réservation disponible.'
        : (error?.response?.data?.message ?? 'Téléchargement impossible.'))
    }
  }, [])

  return <section className="page">
    <PageHeader
      eyebrow="Bibliothèque"
      title="Catalogue"
      description="Données centralisées sur le serveur."
      extra={canImport && <label className="btn-primary"><Upload size={18} />{uploading ? 'Import en cours…' : 'Importer un catalogue'}<input className="hidden" type="file" accept=".csv,.pdf,text/csv,application/pdf" multiple onChange={upload} disabled={uploading} /></label>}
    />
    {message && <Alert>{message}</Alert>}
    <div className="card mt-6">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher un document, titre, auteur, ISBN…"
        aria-label="Rechercher dans le catalogue"
        className="input"
      />
    </div>
    <h2 className="mb-3 mt-6 text-xl font-bold">Documents importés ({filteredDocuments.length})</h2>
    <div className="table-card">
      {loadingDocs ? <p className="p-4 text-slate-600">Chargement des documents…</p> : <DataTable
        columns={documentColumns}
        data={pagedDocuments}
        emptyMessage="Aucun document importé."
        rowKey={(document) => String(document.id)}
      />}
      {docPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-6 py-3 text-sm">
          <button type="button" disabled={docPage === 0} onClick={() => setDocPage((p) => Math.max(0, p - 1))} className="btn-outline px-3 py-1 disabled:opacity-40">Précédent</button>
          <span>Page {docPage + 1} / {docPages}</span>
          <button type="button" disabled={docPage + 1 >= docPages} onClick={() => setDocPage((p) => p + 1)} className="btn-outline px-3 py-1 disabled:opacity-40">Suivant</button>
        </div>
      )}
    </div>
    <h2 className="mb-3 mt-6 text-xl font-bold">Ouvrages ({filteredBooks.length})</h2>
    <div className="table-card">{loadingBooks ? <p className="p-4 text-slate-600">Chargement des ouvrages…</p> : <DataTable columns={bookColumns} data={pagedBooks} emptyMessage="Aucun ouvrage au catalogue." rowKey={(book) => String(book.id)} />}
      {bookPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-6 py-3 text-sm">
          <button type="button" disabled={bookPage === 0} onClick={() => setBookPage((p) => Math.max(0, p - 1))} className="btn-outline px-3 py-1 disabled:opacity-40">Précédent</button>
          <span>Page {bookPage + 1} / {bookPages}</span>
          <button type="button" disabled={bookPage + 1 >= bookPages} onClick={() => setBookPage((p) => p + 1)} className="btn-outline px-3 py-1 disabled:opacity-40">Suivant</button>
        </div>
      )}
    </div>
  </section>
}

export default Catalog
