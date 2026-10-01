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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl ${isFullscreen ? 'sm:h-screen sm:max-h-none sm:w-screen sm:max-w-none sm:rounded-none' : 'sm:rounded-2xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 sm:gap-3 sm:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <h2 className="min-w-0 flex-1 truncate text-base font-bold sm:text-xl">{title}</h2>
            <StatusBadge label={badgeLabel} variant={badgeVariant} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Agrandir en plein écran'}
              title={isFullscreen ? 'Quitter le plein écran' : 'Agrandir en plein écran'}
              className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le lecteur"
              className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        {notice && <p className="border-b border-slate-200 bg-primary-50 px-3 py-2.5 text-[13px] leading-relaxed text-primary-900 sm:px-5 sm:py-3 sm:text-sm">{notice}</p>}
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5">{children}</div>
        {actions && <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:p-5">{actions}</div>}
      </div>
    </div>
  )
}

export default ReaderModal
