import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/authService'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Veuillez saisir votre email.')
      return
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Veuillez saisir une adresse email valide.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authService.requestPasswordReset({ email: normalizedEmail })
      const payload = response?.data ?? response

      if (payload?.success === false) {
        setError(payload.message ?? 'Impossible d’envoyer la demande pour le moment.')
        return
      }

      const successMessage = payload?.message ?? 'Une demande de récupération a été envoyée si le compte existe.'
      setMessage(successMessage)
      setEmail('')
    } catch {
      setError('Impossible d’envoyer la demande pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 px-4 py-24 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white/10 p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Mot de passe oublié</h1>
          <p className="mt-3 text-gray-200">Saisissez votre email pour recevoir une demande de réinitialisation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Email</label>
            <input
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/60 focus:border-white/50"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@exemple.com"
            />
          </div>

          {error && <p className="rounded-xl border border-red-300 bg-red-900/40 p-3 text-sm font-semibold text-red-100">{error}</p>}
          {message && <p className="rounded-xl border border-green-300 bg-green-900/40 p-3 text-sm font-semibold text-green-100">{message}</p>}

          <button
            className="w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-green-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/70">
          <Link to="/login" className="font-semibold text-yellow-300 hover:text-yellow-100">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
