import { useState, useEffect, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, ExternalLink, Trash2, X, Maximize2, Minimize2 } from "lucide-react"
import { useAuth } from '../AuthContext'

const MAX_CATALOG_FILES = 10
const MAX_CATALOG_FILE_SIZE = 25 * 1024 * 1024

interface UploadedCatalog {
  id: string
  name: string
  type: string
  size: number
  file: Blob
  createdAt?: number
}

const getCatalogType = (name: string, mimeType: string) => {
  const extension = name.toLowerCase().split('.').pop()
  return extension === 'pdf' || mimeType === 'application/pdf' ? 'application/pdf' : 'text/csv'
}

const normalizeCsvHeader = (header: string) => header
  .replace(/^\uFEFF/, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

const CATALOG_FILES_STORE = 'losofab_catalog_files'

const parseCatalogCsv = (content: string) => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  const parseLine = (line: string) => {
    const values: string[] = []
    let value = ''
    let quoted = false

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index]
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = !quoted
        }
      } else if (character === separator && !quoted) {
        values.push(value.trim())
        value = ''
      } else {
        value += character
      }
    }
    values.push(value.trim())
    return values
  }

  const headers = parseLine(lines[0]).map(normalizeCsvHeader)
  const titleIndex = headers.findIndex((header) => ['titre', 'title', 'ouvrage', 'nomdulivre'].includes(header))
  const authorIndex = headers.findIndex((header) => ['auteur', 'author', 'ecrivain', 'nomauteur'].includes(header))
  const isbnIndex = headers.findIndex((header) => ['isbn', 'isbn13', 'isbn10'].includes(header))
  const categoryIndex = headers.findIndex((header) => ['categorie', 'category', 'genre', 'type'].includes(header))
  if (titleIndex === -1 || authorIndex === -1 || isbnIndex === -1) return []

  return lines.slice(1).map(parseLine).map((values) => ({
    title: values[titleIndex] ?? '',
    author: values[authorIndex] ?? '',
    isbn: values[isbnIndex] ?? '',
    category: values[categoryIndex] ?? 'Autre',
  })).filter((book) => book.title && book.author && book.isbn)
}

const openCatalogDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('losofab_catalog', 2)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(CATALOG_FILES_STORE)) {
      request.result.createObjectStore(CATALOG_FILES_STORE, { keyPath: 'id' })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const getCatalogFiles = async () => {
  const database = await openCatalogDatabase()
  return new Promise<UploadedCatalog[]>((resolve, reject) => {
    const request = database.transaction(CATALOG_FILES_STORE, 'readonly').objectStore(CATALOG_FILES_STORE).getAll()
    request.onsuccess = () => resolve(request.result as UploadedCatalog[])
    request.onerror = () => reject(request.error)
  })
}

const deleteCatalogFiles = async (catalogFiles: UploadedCatalog[]) => {
  if (catalogFiles.length === 0) return
  const database = await openCatalogDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CATALOG_FILES_STORE, 'readwrite')
    const store = transaction.objectStore(CATALOG_FILES_STORE)
    catalogFiles.forEach((catalogFile) => store.delete(catalogFile.id))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

const saveCatalogFile = async (catalogFile: UploadedCatalog) => {
  const database = await openCatalogDatabase()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(CATALOG_FILES_STORE, 'readwrite').objectStore(CATALOG_FILES_STORE).put(catalogFile)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const deleteCatalogFile = async (id: string) => {
  const database = await openCatalogDatabase()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(CATALOG_FILES_STORE, 'readwrite').objectStore(CATALOG_FILES_STORE).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const Catalog = () => {
  const auth = useAuth()
  const isLoggedIn = Boolean(auth.user)
  const isAdmin = auth.user?.role?.toLowerCase() === 'admin'
  const isBibliothecaire = auth.user?.role?.toLowerCase() === 'bibliothecaire'

  const [bookCount, setBookCount] = useState(0)
  const [message, setMessage] = useState('')
  const [uploadedCatalogs, setUploadedCatalogs] = useState<UploadedCatalog[]>([])
  const [openedCatalog, setOpenedCatalog] = useState<UploadedCatalog | null>(null)
  const [isCatalogMaximized, setIsCatalogMaximized] = useState(false)
  const [catalogPreviewUrl, setCatalogPreviewUrl] = useState('')
  const [catalogPreviewText, setCatalogPreviewText] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('losofab_books')
      const books = raw ? JSON.parse(raw) : []
      setBookCount(Array.isArray(books) ? books.length : 0)
    } catch {
      setBookCount(0)
    }

    getCatalogFiles()
      .then(async (catalogFiles) => {
        const orderedCatalogs = catalogFiles.sort((first, second) =>
          (second.createdAt ?? Number(second.id.match(/-(\d+)$/)?.[1] ?? 0)) -
          (first.createdAt ?? Number(first.id.match(/-(\d+)$/)?.[1] ?? 0))
        )
        const catalogsToDelete = orderedCatalogs.slice(MAX_CATALOG_FILES)
        await deleteCatalogFiles(catalogsToDelete)
        setUploadedCatalogs(orderedCatalogs.slice(0, MAX_CATALOG_FILES))
        if (catalogsToDelete.length > 0) {
          setMessage(`${catalogsToDelete.length} ancien(s) catalogue(s) supprimé(s). Les ${MAX_CATALOG_FILES} plus récents sont conservés.`)
        }
      })
      .catch(() => setMessage('Impossible de charger les catalogues importés.'))
  }, [])

  const uploadCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    try {
      const extension = file.name.toLowerCase().split('.').pop()
      if (!['csv', 'pdf'].includes(extension ?? '')) {
        setMessage('Format refusé : importez uniquement un fichier CSV ou PDF.')
        return
      }
      if (file.size === 0 || file.size > MAX_CATALOG_FILE_SIZE) {
        setMessage('Fichier refusé : sa taille doit être comprise entre 1 octet et 25 Mo.')
        return
      }

      let importedBooksCount = 0
      if (extension === 'csv') {
        const importedBooks = parseCatalogCsv(await file.text())
        if (importedBooks.length === 0) {
          setMessage('CSV refusé : les colonnes Titre, Auteur et ISBN sont obligatoires, avec au moins une ligne valide.')
          return
        }
        importedBooksCount = importedBooks.length
        localStorage.setItem('losofab_books', JSON.stringify(importedBooks))
        setBookCount(importedBooks.length)
      }

      const catalogType = getCatalogType(file.name, file.type)
      const catalogFile: UploadedCatalog = {
        id: `${file.name}-${file.lastModified}-${Date.now()}`,
        name: file.name,
        type: catalogType,
        size: file.size,
        file,
        createdAt: Date.now(),
      }
      await saveCatalogFile(catalogFile)
      setUploadedCatalogs((current) => [catalogFile, ...current].slice(0, MAX_CATALOG_FILES))
      setMessage(`Le catalogue « ${file.name} » a été importé avec succès${extension === 'csv' ? ` (${importedBooksCount} ouvrages)` : ''}.`)
    } catch {
      setMessage('Impossible de conserver le fichier complet dans le catalogue.')
    }

  }

  const openCatalogFile = (catalogFile: UploadedCatalog, maximized = false) => {
    setOpenedCatalog(catalogFile)
    setIsCatalogMaximized(maximized)
  }

  useEffect(() => {
    if (!openedCatalog) {
      setCatalogPreviewUrl('')
      setCatalogPreviewText('')
      return
    }

    const fileUrl = URL.createObjectURL(openedCatalog.file)
    setCatalogPreviewUrl(fileUrl)
    if (getCatalogType(openedCatalog.name, openedCatalog.type) === 'text/csv') {
      openedCatalog.file.text().then(setCatalogPreviewText).catch(() => setCatalogPreviewText('Impossible d’afficher ce fichier.'))
    }

    return () => URL.revokeObjectURL(fileUrl)
  }, [openedCatalog])

  const removeCatalogFile = async (catalogFile: UploadedCatalog) => {
    if (!isAdmin || !window.confirm(`Supprimer le catalogue « ${catalogFile.name} » ?`)) return
    try {
      await deleteCatalogFile(catalogFile.id)
      setUploadedCatalogs((current) => current.filter((item) => item.id !== catalogFile.id))
      setMessage(`Le catalogue « ${catalogFile.name} » a été supprimé.`)
    } catch {
      setMessage(`Impossible de supprimer « ${catalogFile.name} ».`)
    }
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} o`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 text-gray-900">
      <div className="mb-6 rounded-3xl bg-white/95 p-6 shadow-xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-green-700">Administration · catalogue</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Gérer les catalogues</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Importez, vérifiez et consultez les fichiers qui alimentent les prêts et les réservations.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Catalogues</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{uploadedCatalogs.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ouvrages CSV</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{bookCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Formats</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">CSV · PDF</p>
            </div>
          </div>
        </div>

        {!isAdmin && (!isLoggedIn ? (
          <div className="mt-8 rounded-3xl border border-green-700 bg-green-50 p-6 text-gray-900 shadow-inner">
            <h2 className="mb-5 text-2xl font-semibold">Orientation catalogue</h2>
            <p className="text-gray-600">Explorez l’aperçu de nos collections et découvrez les types de catalogues disponibles. Inscrivez-vous pour accéder à toutes les fonctionnalités et réserver des ouvrages.</p>
            <Link to="/register" className="mt-6 inline-flex rounded-full bg-yellow-500 px-6 py-3 text-white transition hover:bg-yellow-600">Créer un compte</Link>
          </div>
        ) : isBibliothecaire ? (
          <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-900 shadow-inner">
            <h2 className="mb-2 text-2xl font-semibold">Espace Bibliothécaire</h2>
            <p className="text-sm">Vous disposez d'un accès complet à la consultation du catalogue et du suivi des stocks. L'ajout et l'importation de nouveaux ouvrages sont réservés à l'administrateur.</p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-slate-50 p-6 text-gray-600 shadow-inner">
            <h2 className="mb-5 text-2xl font-semibold text-gray-900">Gestion du catalogue</h2>
            <p>Seul un administrateur peut ajouter ou importer des ouvrages depuis cette page.</p>
          </div>
        ))}

      </div>


      <div className="rounded-3xl bg-white/95 p-8 shadow-2xl">
        <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-slate-50">
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Catalogues importés · {uploadedCatalogs.length} catalogue(s)
              </div>
              <p className="mt-1 text-xs text-gray-500">{bookCount} ouvrage(s) issu(s) du dernier CSV importé</p>
              {message && <p className="mt-2 text-sm font-semibold text-green-700">{message}</p>}
            </div>
            {isAdmin && (
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-green-700 bg-white px-5 py-2 text-sm font-semibold normal-case tracking-normal text-green-700 transition hover:bg-green-50">
                <Upload size={17} />
                Importer un catalogue
                <input type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" onChange={uploadCatalog} />
              </label>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Titre</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Auteur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">ISBN</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Catégorie</th>
                  {isAdmin && <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {uploadedCatalogs.map((catalogFile) => (
                  <tr key={catalogFile.id} className="bg-green-50/50">
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                            <FileText size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{catalogFile.name}</p>
                            <p className="text-sm text-gray-500">
                              Catalogue complet · {getCatalogType(catalogFile.name, catalogFile.type) === 'application/pdf' ? 'PDF' : 'CSV'} · {formatFileSize(catalogFile.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button type="button" onClick={() => openCatalogFile(catalogFile)} className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800">
                            <ExternalLink size={16} /> Ouvrir
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => removeCatalogFile(catalogFile)} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                              <Trash2 size={16} /> Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {uploadedCatalogs.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-gray-500">Aucun catalogue importé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpenedCatalog(null)}>
          <div className={`${isCatalogMaximized ? 'h-full max-w-none rounded-none' : 'h-[90vh] max-w-6xl rounded-3xl'} flex w-full flex-col overflow-hidden bg-white shadow-2xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="shrink-0 text-green-700" size={22} />
                <h2 className="truncate text-lg font-semibold text-gray-900">{openedCatalog.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsCatalogMaximized((current) => !current)} aria-label={isCatalogMaximized ? 'Réduire l’affichage' : 'Agrandir l’affichage'} title={isCatalogMaximized ? 'Réduire' : 'Agrandir'} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
                  {isCatalogMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button type="button" onClick={() => setOpenedCatalog(null)} aria-label="Fermer l’affichage" className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-gray-100 p-4">
              {getCatalogType(openedCatalog.name, openedCatalog.type) === 'application/pdf' ? (
                <iframe title={openedCatalog.name} src={`${catalogPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`} className="h-full w-full rounded-xl border border-gray-300 bg-white" />
              ) : (
                <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-gray-300 bg-white p-6 text-sm text-gray-800">{catalogPreviewText}</pre>
              )}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

export default Catalog
