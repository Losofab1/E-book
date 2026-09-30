import { useEffect, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { bookService } from '../services/bookService'
import { catalogCirculationService } from '../services/catalogCirculationService'
import { api } from '../services/api'
import { useAuth } from '../AuthContext'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'

type Book = { id: number; title: string; author: string; isbn: string; category: string; availableCopies: number }

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
  const [documents, setDocuments] = useState<{ id: number; name: string; type: string }[]>([])
  const canImport = user?.role === 'admin' || user?.role === 'bibliothecaire'

  const load = async () => {
    try { const [bookResponse, documentResponse] = await Promise.all([bookService.getAll(), api.get<{ id: number; name: string; type: string }[]>('/catalogs')]); setBooks(bookResponse.data as Book[]); setDocuments(documentResponse.data) }
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
    <div className="card mt-5"><h2 className="font-bold">Documents importés</h2><div className="mt-3 flex flex-wrap gap-2">{documents.map(document => <button key={document.id} type="button" onClick={() => void download(document)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-primary-800 hover:border-primary-700 hover:bg-primary-50"><Download size={16} />{document.name}</button>)}{documents.length === 0 && <p className="text-slate-500">Aucun document importé.</p>}</div></div>
    <div className="table-card mt-6">{loading ? <p className="p-4 text-slate-600">Chargement…</p> : <DataTable columns={bookColumns} data={books} emptyMessage="Aucun ouvrage au catalogue." rowKey={(book) => String(book.id)} />}</div>
  </section>
}

export default Catalog
