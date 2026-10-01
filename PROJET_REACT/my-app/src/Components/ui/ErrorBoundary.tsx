import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Filet de sécurité : sans lui, une erreur de rendu (ex. morceau JS
 * non chargé sur connexion instable) démonte toute l'application
 * et laisse un écran vide. La variante `fallback` garde toujours
 * un chemin de retour vers la liste.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default ErrorBoundary
