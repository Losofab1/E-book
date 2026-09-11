import type { FormEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/authService'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Token de réinitialisation introuvable.')
      return
    }

    if (!password || password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authService.resetPassword({ token, password, confirmPassword })
      const payload = response?.data

      if (payload?.success === false) {
        setError(payload.message ?? 'La réinitialisation a échoué ou le lien est expiré.')
        return
      }

      setMessage(payload?.message ?? 'Mot de passe réinitialisé avec succès.')
      setPassword('')
      setConfirmPassword('')

      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 900)
    } catch {
      setError('La réinitialisation a échoué ou le lien est expiré.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 px-4 py-24 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white/10 p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Réinitialisation</h1>
          <p className="mt-3 text-gray-200">Définissez un nouveau mot de passe pour sécuriser votre compte.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Nouveau mot de passe</label>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/60 focus:border-white/50"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/60 focus:border-white/50"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-300 bg-red-900/40 p-3 text-sm font-semibold text-red-100">{error}</p>}
          {message && <p className="rounded-xl border border-green-300 bg-green-900/40 p-3 text-sm font-semibold text-green-100">{message}</p>}

          <button
            className="w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-green-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/70">
          <Link to="/login" className="font-semibold text-yellow-300 hover:text-yellow-100">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
