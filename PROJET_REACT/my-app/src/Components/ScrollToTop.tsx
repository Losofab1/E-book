import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Remonte chaque page en haut (en-tête) lors d'une navigation.
// Sans ça, React Router conserve le scrollY précédent et la nouvelle
// page peut apparaître directement au niveau du footer.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Ne pas casser les ancres / la modale lecteur (#lecture) :
    // on laisse le navigateur gérer le positionnement dans ce cas.
    if (hash) return
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual'
      }
    } catch {
      /* non bloquant */
    }
    window.scrollTo(0, 0)
    document.documentElement?.scrollTo?.(0, 0)
  }, [pathname, hash])

  return null
}

export default ScrollToTop
