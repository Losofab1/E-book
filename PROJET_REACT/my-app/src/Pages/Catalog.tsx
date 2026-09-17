import { useEffect, useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { bookService } from '../services/bookService'
import { api } from '../services/api'
import { useAuth } from '../AuthContext'

type Book = { id: number; title: string; author: string; isbn: string; category: string; availableCopies: number }

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

  return <section className="mx-auto max-w-6xl px-4 py-10 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Catalogue</h1><p className="mt-1 text-slate-600">Données centralisées sur le serveur.</p></div>
      {canImport && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"><Upload size={18} />Importer un catalogue<input className="hidden" type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={upload} /></label>}
    </div>
    {message && <p role="status" className="mt-4 rounded-lg bg-white p-3 shadow">{message}</p>}
    <div className="mt-5 rounded-xl bg-white p-4 shadow"><h2 className="font-bold">Documents importés</h2><div className="mt-3 flex flex-wrap gap-2">{documents.map(document => <a key={document.id} target="_blank" rel="noreferrer" href={`${api.defaults.baseURL}/catalogs/${document.id}/download`} className="rounded border px-3 py-2 text-green-700">{document.name}</a>)}{documents.length === 0 && <p className="text-slate-500">Aucun document importé.</p>}</div></div>
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow"><table className="min-w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3">Titre</th><th className="p-3">Auteur</th><th className="p-3">ISBN</th><th className="p-3">Catégorie</th><th className="p-3">Disponibles</th></tr></thead><tbody>{!loading && books.map(book => <tr className="border-t" key={book.id}><td className="p-3 font-semibold">{book.title}</td><td className="p-3">{book.author}</td><td className="p-3">{book.isbn}</td><td className="p-3">{book.category}</td><td className="p-3">{book.availableCopies}</td></tr>)}</tbody></table>{loading && <p className="p-4">Chargement…</p>}</div>
  </section>
}

export default Catalog
