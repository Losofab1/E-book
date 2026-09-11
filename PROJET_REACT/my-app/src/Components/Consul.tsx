
import { useState, useEffect, useRef } from 'react'
import { BookOpenText, FileText, X, Maximize2, Minimize2 } from 'lucide-react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useAuth } from '../AuthContext'
import { formatAccessExpiry, getDigitalAccess, type DigitalAccess } from '../utils/digitalAccess'

GlobalWorkerOptions.workerSrc = pdfWorker

type UploadedCatalog = {
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

const getUploadedCatalogs = () => new Promise<UploadedCatalog[]>((resolve, reject) => {
  const request = indexedDB.open('losofab_catalog', 2)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('losofab_catalog_files')) {
      request.result.createObjectStore('losofab_catalog_files', { keyPath: 'id' })
    }
  }
  request.onsuccess = () => {
    const transaction = request.result.transaction('losofab_catalog_files', 'readonly')
    const filesRequest = transaction.objectStore('losofab_catalog_files').getAll()
    filesRequest.onsuccess = () => resolve((filesRequest.result as UploadedCatalog[]).sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0)))
    filesRequest.onerror = () => reject(filesRequest.error)
  }
  request.onerror = () => reject(request.error)
})

const Consul = () => {
  const auth = useAuth()
  const [storedCount, setStoredCount] = useState(0)
  const [uploadedCatalogs, setUploadedCatalogs] = useState<UploadedCatalog[]>([])
  const [openedCatalog, setOpenedCatalog] = useState<UploadedCatalog | null>(null)
  const [catalogPreviewUrl, setCatalogPreviewUrl] = useState('')
  const [catalogPreviewText, setCatalogPreviewText] = useState('')
  const [catalogAccess, setCatalogAccess] = useState<DigitalAccess | null>(null)
  const [isCatalogMaximized, setIsCatalogMaximized] = useState(false)
  const catalogViewerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [previewError, setPreviewError] = useState('')

  const openCatalog = (catalogFile: UploadedCatalog) => {
    setOpenedCatalog(catalogFile)
    setCatalogAccess(getDigitalAccess(auth.user?.email, catalogFile.name, auth.user?.role))
    setIsCatalogMaximized(false)
  }

  const toggleCatalogFullscreen = async () => {
    if (!catalogViewerRef.current) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await catalogViewerRef.current.requestFullscreen()
      }
    } catch {
      setIsCatalogMaximized((current) => !current)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCatalogMaximized(document.fullscreenElement === catalogViewerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    getUploadedCatalogs().then((catalogs) => {
      setUploadedCatalogs(catalogs)
      setStoredCount(catalogs.length)
    }).catch(() => {
      setUploadedCatalogs([])
      setStoredCount(0)
    })
  }, [])

  useEffect(() => {
    if (!openedCatalog) {
      setCatalogPreviewUrl('')
      setCatalogPreviewText('')
      setCatalogAccess(null)
      setIsCatalogMaximized(false)
      setPreviewError('')
      return
    }

    const fileUrl = URL.createObjectURL(openedCatalog.file)
    setCatalogPreviewUrl(fileUrl)
    setPreviewError('')
    if (getCatalogType(openedCatalog.name, openedCatalog.type) === 'text/csv') {
      openedCatalog.file.text().then(setCatalogPreviewText).catch(() => setCatalogPreviewText('Impossible d’afficher ce fichier.'))
    }
    if (getCatalogType(openedCatalog.name, openedCatalog.type) === 'application/pdf' && catalogAccess?.level !== 'full') {
      let active = true
      const renderFirstPage = async () => {
        const pdf = await getDocument({ data: await openedCatalog.file.arrayBuffer() }).promise
        const page = await pdf.getPage(1)
          if (!active || !previewCanvasRef.current) return
          const viewport = page.getViewport({ scale: 1.25 })
          const canvas = previewCanvasRef.current
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas indisponible')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: context, viewport }).promise
      }
      renderFirstPage().catch(() => {
          if (active) setPreviewError('Impossible d’afficher la première page de ce PDF.')
      })
      return () => {
        active = false
        URL.revokeObjectURL(fileUrl)
      }
    }
    return () => URL.revokeObjectURL(fileUrl)
  }, [openedCatalog, catalogAccess])

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} o`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-24 text-gray-900">
      <div className="mx-auto max-w-6xl rounded-3xl bg-green-200 p-12 shadow-xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-800">Catalogue numérique</p>
            <h1 className="mt-2 text-4xl font-bold">Catalogues disponibles</h1>
            <p className="mt-4 text-lg text-gray-700">Consultez les catalogues importés et ouvrez les documents selon vos droits d’accès.</p>
          </div>
          <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
            <p className="text-5xl font-black text-gray-800">{storedCount.toLocaleString()}</p>
            <p className="mt-2 text-lg font-semibold text-gray-700">ouvrages disponibles</p>
            <p className="mt-1 text-sm text-gray-500">catalogues importés</p>
          </div>
        </div>

        {uploadedCatalogs.length > 0 && (
          <div className="mt-12 rounded-3xl bg-white p-8 shadow-xl">
            <h2 className="mb-5 text-2xl font-bold text-gray-900">Catalogues disponibles</h2>
            <div className="space-y-3">
              {uploadedCatalogs.map((catalogFile) => (
                <div key={catalogFile.id} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="shrink-0 text-green-700" size={24} />
                    <div className="min-w-0 text-left">
                      <p className="truncate font-semibold text-gray-900">{catalogFile.name}</p>
                      <p className="text-sm text-gray-500">Catalogue complet · {getCatalogType(catalogFile.name, catalogFile.type) === 'application/pdf' ? 'PDF' : 'CSV'} · {formatFileSize(catalogFile.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => openCatalog(catalogFile)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-800">
                    <BookOpenText size={16} /> Consulter
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {openedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpenedCatalog(null)}>
          <div ref={catalogViewerRef} className={`${isCatalogMaximized ? 'h-full max-w-none rounded-none' : 'h-[92vh] max-w-6xl rounded-3xl'} flex w-full flex-col overflow-hidden bg-white shadow-2xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="shrink-0 text-green-700" size={22} />
                <h2 className="truncate text-lg font-semibold text-gray-900">{openedCatalog.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCatalogFullscreen}
                  aria-label={isCatalogMaximized ? 'Réduire l’affichage' : 'Agrandir en plein écran'}
                  title={isCatalogMaximized ? 'Réduire' : 'Agrandir en plein écran'}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  {isCatalogMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button type="button" onClick={() => setOpenedCatalog(null)} aria-label="Fermer l’affichage" className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-gray-100 p-4">
              {getCatalogType(openedCatalog.name, openedCatalog.type) === 'application/pdf' && catalogAccess?.level !== 'full' ? (
                <div className="flex h-full flex-col items-center overflow-auto rounded-xl border border-gray-300 bg-white p-6 text-center">
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">Mode aperçu · première page</h3>
                  <canvas ref={previewCanvasRef} className="max-w-full shadow-md" aria-label={`Première page de ${openedCatalog.name}`} />
                  {previewError && <p className="mt-4 text-sm font-semibold text-red-700">{previewError}</p>}
                  <p className="mt-4 text-sm text-gray-600">La lecture intégrale est réservée aux utilisateurs ayant un prêt actif ou une réservation disponible.</p>
                  {catalogAccess?.reason === 'expired' && <p className="mt-2 text-sm font-semibold text-red-700">Votre droit numérique a expiré.</p>}
                  {!auth.user && <p className="mt-2 text-sm text-gray-600">Connectez-vous pour accéder à vos droits de lecture.</p>}
                </div>
              ) : getCatalogType(openedCatalog.name, openedCatalog.type) === 'application/pdf' ? (
                <iframe title={openedCatalog.name} src={`${catalogPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`} className="h-full w-full rounded-xl border border-gray-300 bg-white" />
              ) : (
                <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-gray-300 bg-white p-6 text-left text-sm text-gray-800">{catalogPreviewText}</pre>
              )}
              {catalogAccess?.level === 'full' && catalogAccess.expiresAt && (
                <p className="mt-2 text-center text-xs font-semibold text-green-700">Accès intégral jusqu’au {formatAccessExpiry(catalogAccess.expiresAt)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Consul
