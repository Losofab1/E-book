import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize, Minimize, X } from 'lucide-react'
import StatusBadge from './StatusBadge'

type ReaderBadgeVariant = 'success' | 'warning' | 'info' | 'neutral'

interface ReaderModalProps {
  title: string
  badgeLabel: string
  badgeVariant: ReaderBadgeVariant
  notice?: string
  actions?: ReactNode
  children: ReactNode
  onClose: () => void
}

const ReaderModal = ({ title, badgeLabel, badgeVariant, notice, actions, children, onClose }: ReaderModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await panelRef.current?.requestFullscreen()
      }
    } catch {
      /* plein écran indisponible sur ce navigateur */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl ${isFullscreen ? 'h-screen max-h-none w-screen max-w-none rounded-none' : 'rounded-2xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="truncate text-xl font-bold">{title}</h2>
            <StatusBadge label={badgeLabel} variant={badgeVariant} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Agrandir en plein écran'}
              title={isFullscreen ? 'Quitter le plein écran' : 'Agrandir en plein écran'}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le lecteur"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {notice && <p className="border-b border-slate-200 bg-primary-50 px-5 py-3 text-sm text-primary-900">{notice}</p>}
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {actions && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 p-5">{actions}</div>}
      </div>
    </div>
  )
}

export default ReaderModal
