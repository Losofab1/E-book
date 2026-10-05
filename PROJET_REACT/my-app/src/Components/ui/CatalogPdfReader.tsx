import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Minus, Plus, Scan } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface CatalogPdfReaderProps {
  url: string
  title: string
  /** Personnel uniquement : affiche « Ouvrir en grand » et autorise le téléchargement natif. */
  allowDownload?: boolean
  /** 0..1 pendant le téléchargement de la version intégrale (mobile : feedback visible). */
  progress?: number | null
  /** URL HTTP directe du contenu intégral : pdf.js ne charge que les pages
   * demandées (Range) au lieu de tout télécharger d'un coup. */
  streamUrl?: string | null
  streamHeaders?: Record<string, string>
  onStreamProgress?: (ratio: number) => void
  onStreamReady?: () => void
  onStreamFailed?: () => void
}

const MIN_ZOOM = 0.75
const MAX_ZOOM = 3
/** Plafond de pixels par page : évite les crashs mémoire sur téléphone (grosses pages + zoom). */
const MAX_CANVAS_PIXELS = 12_000_000

const CatalogPdfReader = ({ url, title, allowDownload = false, progress = null, streamUrl = null, streamHeaders, onStreamProgress, onStreamReady, onStreamFailed }: CatalogPdfReaderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageWrappers = useRef(new Map<number, HTMLDivElement | null>())
  const pageCanvases = useRef(new Map<number, HTMLCanvasElement | null>())
  const renderedForKey = useRef(new Map<number, string>())
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [renderedCount, setRenderedCount] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  // En cas de PDF illisible par le moteur avancé, on bascule
  // automatiquement sur le lecteur natif : aucun écran d'erreur.
  const [useNative, setUseNative] = useState(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  // Callbacks stables : l'effet de chargement ne dépend que de l'URL,
  // mais doit toujours appeler la dernière version des callbacks.
  const streamCallbacks = useRef({ onStreamProgress, onStreamReady, onStreamFailed, streamHeaders })
  streamCallbacks.current = { onStreamProgress, onStreamReady, onStreamFailed, streamHeaders }

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
    setUseNative(false)
    // On garde l'ancien nombre de pages pendant le basculement
    // aperçu → intégrale : pas d'écran blanc, l'aperçu reste visible
    // avec un bandeau de chargement au lieu d'un flash.
    renderedForKey.current.clear()
    setRenderedCount(0)
    setCurrentPage(1)
    // Version intégrale : streaming HTTP (Range) quand disponible —
    // seules les pages lues transitent, idéal sur mobile. Sinon blob local.
    const loadingTask = streamUrl
      ? pdfjsLib.getDocument({ url: streamUrl, httpHeaders: streamCallbacks.current.streamHeaders, withCredentials: false })
      : pdfjsLib.getDocument({ url, withCredentials: false })
    if (streamUrl) {
      loadingTask.onProgress = (data: { loaded: number; total: number }) => {
        const cb = streamCallbacks.current.onStreamProgress
        if (!cancelled && cb && data.total > 0) cb(Math.min(1, data.loaded / data.total))
      }
    }
    loadingTask
      .promise.then((pdf) => {
        if (cancelled) {
          void pdf.destroy()
          return
        }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
        const ready = streamCallbacks.current.onStreamReady
        if (streamUrl && ready) ready()
      })
      .catch(() => {
        if (!cancelled) {
          // Streaming impossible (réseau, droits) : le parent bascule
          // sur le téléchargement classique ; à défaut, lecteur natif.
          const failed = streamCallbacks.current.onStreamFailed
          if (streamUrl && failed) {
            failed()
          } else {
            setUseNative(true)
            setLoading(false)
          }
        }
      })
    return () => {
      cancelled = true
      const pdf = pdfRef.current
      pdfRef.current = null
      if (pdf) void pdf.destroy().catch(() => undefined)
    }
  }, [url, streamUrl])

  // Lecture en défilement continu : toutes les pages s'affichent les unes
  // sous les autres. Chaque page se rend quand elle approche de l'écran
  // (IntersectionObserver), jamais toutes d'un coup — fluide sur téléphone.
  useEffect(() => {
    const pdf = pdfRef.current
    if (loading || !pdf || numPages === 0 || scrollWidth <= 0) return
    let cancelled = false
    const pending = new Set<{ cancel: () => void }>()
    const renderKey = `${zoom.toFixed(2)}x${Math.round(scrollWidth)}`
    // Nouveau zoom / nouvelle largeur : tout sera re-rendu paresseusement.
    if (!renderedForKey.current.get(-1)) {
      renderedForKey.current.clear()
      renderedForKey.current.set(-1, renderKey)
      setRenderedCount(0)
    } else if (renderedForKey.current.get(-1) !== renderKey) {
      renderedForKey.current.clear()
      renderedForKey.current.set(-1, renderKey)
      setRenderedCount(0)
    }

    const renderPage = async (pageNumber: number) => {
      if (cancelled || renderedForKey.current.get(pageNumber) === renderKey) return
      renderedForKey.current.set(pageNumber, renderKey)
      const canvas = pageCanvases.current.get(pageNumber)
      const currentPdf = pdfRef.current
      if (!canvas || !currentPdf) return
      try {
        const pdfPage = await currentPdf.getPage(pageNumber)
        if (cancelled || renderedForKey.current.get(pageNumber) !== renderKey) return
        const baseViewport = pdfPage.getViewport({ scale: 1 })
        const fitScale = (scrollWidth - 16) / baseViewport.width
        const viewport = pdfPage.getViewport({ scale: Math.max(0.2, fitScale * zoom) })
        // Téléphone : DPR plafonné + pixels plafonnés, sinon le canvas
        // explose en mémoire et le rendu rame ou échoue.
        const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
        const narrow = scrollWidth > 0 && scrollWidth < 480
        const dprCap = coarse || narrow ? 1.5 : 2
        let dpr = Math.min(dprCap, window.devicePixelRatio || 1)
        const cssArea = Math.max(1, viewport.width * viewport.height)
        if (cssArea * dpr * dpr > MAX_CANVAS_PIXELS) {
          dpr = Math.sqrt(MAX_CANVAS_PIXELS / cssArea)
        }
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        const context = canvas.getContext('2d')
        if (context) {
          context.setTransform(dpr, 0, 0, dpr, 0, 0)
          const task = pdfPage.render({ canvasContext: context, viewport })
          const cancellable = task as unknown as { cancel: () => void }
          pending.add(cancellable)
          await task.promise
          pending.delete(cancellable)
        }
        pdfPage.cleanup()
        if (!cancelled && renderedForKey.current.get(pageNumber) === renderKey) {
          setRenderedCount((c) => c + 1)
        }
      } catch {
        pending.clear()
        if (!cancelled) {
          // Coupure réseau en cours de lecture streamée : repli blob.
          const failed = streamCallbacks.current.onStreamFailed
          if (streamUrl && failed) {
            renderedForKey.current.delete(pageNumber)
            failed()
          }
        }
      }
    }

    const container = scrollRef.current
    const nearObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset.page ?? 0)
          if (entry.isIntersecting && pageNumber > 0) void renderPage(pageNumber)
        }
      },
      { root: container, rootMargin: '1200px 0px' },
    )
    // Page la plus visible → indicateur « page X / N ».
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset.page ?? 0)
          if (entry.isIntersecting && pageNumber > 0) setCurrentPage(pageNumber)
        }
      },
      { root: container, rootMargin: '-40% 0px -40% 0px' },
    )
    pageWrappers.current.forEach((element) => {
      if (element) {
        nearObserver.observe(element)
        visibleObserver.observe(element)
      }
    })
    // La première page part sans attendre le défilement.
    void renderPage(1)
    return () => {
      cancelled = true
      nearObserver.disconnect()
      visibleObserver.disconnect()
      pending.forEach((task) => {
        try {
          task.cancel()
        } catch {
          /* rendu déjà terminé */
        }
      })
      pending.clear()
    }
  }, [pageWrappers, loading, numPages, zoom, scrollWidth, streamUrl, url])

  if (!url && !streamUrl) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Document vide ou lien expiré. Fermez puis rouvrez la lecture.
      </p>
    )
  }

  if (loading && numPages === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" role="status">
        Chargement du PDF optimisé mobile…
      </div>
    )
  }

  if (useNative) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <iframe
          src={url}
          title={title}
          className="h-[62dvh] w-full sm:h-[68vh]"
          // Adhérents : pas de téléchargement explicite. Sans allow-downloads,
          // la visionneuse native ne propose pas d'enregistrement.
          sandbox={allowDownload ? undefined : 'allow-same-origin allow-scripts'}
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {loading && numPages > 0 && (
        <p className="border-b border-primary-100 bg-primary-50 px-3 py-2 text-[13px] font-medium text-primary-900" role="status">
          {progress !== null && progress !== undefined
            ? `Version intégrale en cours de chargement — ${Math.round(progress * 100)} %…`
            : 'Version intégrale en cours de chargement — toutes les pages arrivent…'}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-2">
        <span className="min-w-[72px] px-2 text-center text-sm font-semibold" aria-live="polite">
          Page {Math.min(currentPage, Math.max(1, numPages))} / {Math.max(1, numPages)}
        </span>
        {renderedCount < numPages && (
          <span className="text-[13px] text-slate-500">Préparation des pages… {renderedCount}/{numPages}</span>
        )}
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
            aria-label="Agrandir la taille du texte"
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
          {allowDownload && (
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
          )}
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[62dvh] overflow-auto bg-slate-50 p-2 sm:max-h-[68vh] sm:p-3">
        <div className="mx-auto flex w-fit min-w-full flex-col items-center gap-3">
          {Array.from({ length: numPages }, (_, index) => index + 1).map((pageNumber) => (
            <div
              key={pageNumber}
              data-page={pageNumber}
              ref={(element) => {
                pageWrappers.current.set(pageNumber, element)
              }}
              className="flex min-h-[200px] w-fit max-w-full items-center justify-center"
            >
              <canvas
                ref={(element) => {
                  pageCanvases.current.set(pageNumber, element)
                }}
                className="max-w-full rounded-lg bg-white shadow"
                role="img"
                aria-label={`Page ${pageNumber} de ${title}`}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-slate-200 bg-white px-3 py-2 text-center text-[13px] text-slate-600">
        Faites défiler pour lire toutes les pages ({numPages} page{numPages === 1 ? '' : 's'}).
      </p>
    </div>
  )
}

export default CatalogPdfReader
