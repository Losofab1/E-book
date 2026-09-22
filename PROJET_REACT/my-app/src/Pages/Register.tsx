import type { FormEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'etudiant' | 'professeur' | 'adherent'>('etudiant')
  const [error, setError] = useState('')
  const auth = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password || !role) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    const success = await auth.register(name, email, password, role)
    if (success) {
      sessionStorage.setItem('losofab_auth_notice', 'Inscription réussie. Votre compte est prêt.')
      navigate('/profile')
      return
    }

    setError('Impossible de créer le compte. Vérifiez vos informations ou essayez un autre email.')
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (value.length > 0 && value.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
    } else if (error === 'Le mot de passe doit contenir au moins 6 caractères.') {
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-slate-900 px-4 py-24 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Inscription</h1>
          <p className="mt-3 text-gray-200">Créez un compte pour accéder à votre espace personnel.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">Nom complet</label>
            <input
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/60 focus:border-white/50"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>
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
                minLength={6}
                required
                aria-invalid={password.length > 0 && password.length < 6}
                aria-describedby="password-requirement"
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/60 focus:border-white/50"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
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
            <p id="password-requirement" className="mt-2 text-xs text-white/70">Au moins 6 caractères.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Type de membre</label>
            <select
              className="w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
              value={role}
              onChange={(e) => setRole(e.target.value as 'etudiant' | 'professeur' | 'adherent')}
            >
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
              <option value="adherent">Adhérent simple</option>
            </select>
          </div>
          {error && (
            <p role="alert" aria-live="assertive" className="rounded-xl border border-red-400/50 bg-red-950/50 p-3 text-sm font-semibold text-red-100">
              {error}
            </p>
          )}
          <button className="w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-green-900 transition hover:bg-yellow-300">Créer un compte</button>
        </form>

        <p className="mt-6 text-center text-sm text-white/70">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-yellow-300 hover:text-yellow-100">Connectez-vous</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
