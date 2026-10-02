import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, Scan } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface CatalogPdfReaderProps {
  url: string
  title: string
}

const MIN_ZOOM = 0.75
const MAX_ZOOM = 3

const CatalogPdfReader = ({ url, title }: CatalogPdfReaderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')
  const [scrollWidth, setScrollWidth] = useState(0)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      if (width > 0) setScrollWidth(width)
    })
    observer.observe(element)
    setScrollWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [loading])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setNumPages(0)
    setPage(1)
    pdfjsLib
      .getDocument({ url, withCredentials: false })
      .promise.then((pdf) => {
        if (cancelled) {
          void pdf.destroy()
          return
        }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('PDF illisible sur ce téléphone. Essayez « Ouvrir » ou le téléchargement.')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      const pdf = pdfRef.current
      pdfRef.current = null
      if (pdf) void pdf.destroy().catch(() => undefined)
    }
  }, [url])

  useEffect(() => {
    if (loading || numPages === 0 || scrollWidth <= 0) return
    let cancelled = false
    let renderTask: { cancel: () => void } | null = null
    const render = async () => {
      const canvas = canvasRef.current
      const pdf = pdfRef.current
      if (!canvas || !pdf) return
      setRendering(true)
      try {
        const safePage = Math.min(Math.max(1, page), pdf.numPages)
        const pdfPage = await pdf.getPage(safePage)
        if (cancelled) return
        const baseViewport = pdfPage.getViewport({ scale: 1 })
        const fitScale = (scrollWidth - 16) / baseViewport.width
        const viewport = pdfPage.getViewport({ scale: Math.max(0.2, fitScale * zoom) })
        const dpr = Math.min(3, window.devicePixelRatio || 1)
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        const context = canvas.getContext('2d')
        if (context) {
          context.setTransform(dpr, 0, 0, dpr, 0, 0)
          const task = pdfPage.render({ canvasContext: context, viewport })
          renderTask = task as unknown as { cancel: () => void }
          await task.promise
        }
        pdfPage.cleanup()
        if (!cancelled) setRendering(false)
      } catch (error) {
        if (!cancelled) {
          if ((error as Error)?.name !== 'RenderingCancelledException') {
            setError('Page illisible. Changez de page ou ouvrez le PDF dans le navigateur.')
          }
          setRendering(false)
        }
      }
    }
    void render()
    return () => {
      cancelled = true
      try {
        renderTask?.cancel()
      } catch {
        /* rendu déjà terminé */
      }
    }
  }, [page, zoom, scrollWidth, numPages, loading])

  const goTo = useCallback(
    (next: number) => setPage((p) => Math.min(Math.max(1, next), Math.max(1, numPages))),
    [numPages],
  )

  if (!url) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Document vide ou lien expiré. Fermez puis rouvrez la lecture.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" role="status">
        Chargement du PDF optimisé mobile…
      </div>
    )
  }

  if (error && numPages === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
        <a href={url} target="_blank" rel="noreferrer" className="btn-outline min-h-[44px] w-full text-sm">
          <ExternalLink size={16} /> Ouvrir dans le navigateur
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="min-w-[72px] text-center text-sm font-semibold" aria-live="polite">
            {page} / {Math.max(1, numPages)}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= numPages}
            aria-label="Page suivante"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Réduire le texte"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Minus size={20} />
          </button>
          <span className="min-w-[52px] text-center text-sm font-semibold">{Math.round(zoom * 100)} %</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Agrandir le texte"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Ajuster à la largeur de l’écran"
            title="Ajuster à la largeur"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            <Scan size={20} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Ouvrir ${title} en plein écran navigateur`}
            title="Ouvrir en grand"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>
      {error && <p className="bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}
      <div ref={scrollRef} className="max-h-[62dvh] overflow-auto bg-slate-50 p-2 sm:max-h-[68vh] sm:p-3">
        <div className="mx-auto w-fit">
          <canvas ref={canvasRef} className="max-w-full rounded-lg bg-white shadow" role="img" aria-label={`Page ${page} de ${title}`} />
          {rendering && <p className="mt-2 text-center text-[13px] text-slate-500">Rendu de la page…</p>}
        </div>
      </div>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-3 py-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            className="btn-outline min-h-[44px] flex-1 text-sm sm:flex-none sm:px-6"
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={page >= numPages}
            onClick={() => goTo(page + 1)}
            className="btn-primary min-h-[44px] flex-1 text-sm sm:flex-none sm:px-6"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}

export default CatalogPdfReader
