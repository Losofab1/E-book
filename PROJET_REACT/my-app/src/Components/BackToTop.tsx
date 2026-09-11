import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 320)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut de la page"
      title="Remonter en haut"
      className="fixed bottom-6 left-1/2 z-40 inline-flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-green-700 bg-transparent text-green-700 shadow-lg transition hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      <ArrowUp size={22} />
    </button>
  )
}

export default BackToTop
