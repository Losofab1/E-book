import { useEffect, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { bookService } from '../services/bookService'
import { catalogCirculationService } from '../services/catalogCirculationService'
import { api } from '../services/api'
import { useAuth } from '../AuthContext'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'

type Book = { id: number; title: string; author: string; isbn: string; category: string; availableCopies: number }

type CatalogFile = { id: number; name: string; type: string; uploadedAt?: string }

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
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<CatalogFile[]>([])
  const canImport = user?.role === 'admin' || user?.role === 'bibliothecaire'

  const documentColumns: TableColumn<CatalogFile>[] = [
    { key: 'name', label: 'Document', render: (document) => <span className="font-medium">{document.name}</span> },
    {
      key: 'type',
      label: 'Format',
      render: (document) => (document.type.includes('pdf')
        ? <StatusBadge label="PDF" variant="info" />
        : <StatusBadge label="CSV" variant="neutral" />),
    },
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

  const load = async () => {
    try { const [bookResponse, documentResponse] = await Promise.all([bookService.getAll(), api.get<CatalogFile[]>('/catalogs')]); setBooks(bookResponse.data as Book[]); setDocuments(documentResponse.data) }
    catch { setMessage('Impossible de charger le catalogue depuis le serveur.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.(csv|pdf)$/i.test(file.name)) { setMessage('Les formats CSV et PDF sont autorisés.'); return }
    try {
      const data = new FormData(); data.append('file', file)
      const response = await api.post<{ importedCount: number; message: string }>('/catalogs', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage(`${response.data.message} Les doublons ISBN éventuels sont ignorés.`)
      await load()
    } catch (error: any) { setMessage(error.response?.data?.message ?? 'Import impossible.') }
  }

  const download = async (document: { id: number; name: string }) => {
    try { await catalogCirculationService.download(document.id, document.name) }
    catch { setMessage('Téléchargement impossible.') }
  }

  return <section className="page">
    <PageHeader
      eyebrow="Bibliothèque"
      title="Catalogue"
      description="Données centralisées sur le serveur."
      extra={canImport && <label className="btn-primary"><Upload size={18} />Importer un catalogue<input className="hidden" type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={upload} /></label>}
    />
    {message && <Alert>{message}</Alert>}
    <h2 className="mb-3 mt-6 text-xl font-bold">Documents importés ({documents.length})</h2>
    <div className="table-card">
      <DataTable
        columns={documentColumns}
        data={documents}
        emptyMessage="Aucun document importé."
        rowKey={(document) => String(document.id)}
      />
    </div>
    <h2 className="mb-3 mt-6 text-xl font-bold">Ouvrages ({books.length})</h2>
    <div className="table-card">{loading ? <p className="p-4 text-slate-600">Chargement…</p> : <DataTable columns={bookColumns} data={books} emptyMessage="Aucun ouvrage au catalogue." rowKey={(book) => String(book.id)} />}</div>
  </section>
}

export default Catalog
