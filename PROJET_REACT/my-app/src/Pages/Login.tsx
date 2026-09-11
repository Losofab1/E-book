import type { FormEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const success = await auth.login(email, password)
    if (success) {
      const authenticatedUser = auth.getUserByEmail(cleanEmail)

      if (from) {
        navigate(from, { replace: true })
      } else if (authenticatedUser?.role === 'admin' || authenticatedUser?.role === 'bibliothecaire') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/profile', { replace: true })
      }
    } else {
      setError('Identifiants invalides ou compte temporairement bloqué. Réessayez plus tard.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 px-4 py-24 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Connexion</h1>
          <p className="mt-3 text-gray-200">Connectez-vous pour accéder à votre espace privé.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
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
          <div>
            <label className="mb-2 block text-sm font-semibold">Mot de passe</label>
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
          {error && <p className="text-sm font-semibold text-red-300 bg-red-950/40 p-3 rounded-xl border border-red-500/30">{error}</p>}
          <div className="flex items-center justify-between gap-4 text-sm">
            <Link to="/forgot-password" className="font-semibold text-yellow-300 hover:text-yellow-100">Mot de passe oublié ?</Link>
            <span className="text-white/60">Sécurité renforcée</span>
          </div>
          <button className="w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-green-900 transition hover:bg-yellow-300">Se connecter</button>
        </form>

        <p className="mt-6 text-center text-sm text-white/70">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-yellow-300 hover:text-yellow-100">Inscrivez-vous ici</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
