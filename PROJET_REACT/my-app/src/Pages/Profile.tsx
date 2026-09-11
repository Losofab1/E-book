import { useAuth } from '../AuthContext'
import { Link } from 'react-router-dom'
import { useState } from 'react'

const Profile = () => {
  const auth = useAuth()
  const user = auth.user
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  if (!user) return null

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    const success = await auth.updateCredentials({
      name,
      email,
      password: password.trim() ? password : undefined,
    })

    if (success) {
      setMessage('Identifiants mis à jour avec succès.')
      setPassword('')
    } else {
      setMessage('Erreur lors de la mise à jour des identifiants.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-24 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-2xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Espace privé</h1>
            <p className="mt-2 text-gray-600">Bienvenue, {user.name}. Gérez votre compte et consultez vos droits.</p>
          </div>
          <div className="rounded-3xl bg-green-50 px-5 py-3 text-sm font-semibold text-green-700">Rôle : {user.role}</div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6">
            <h2 className="text-2xl font-semibold">Mes informations</h2>
            <p className="mt-4 text-gray-700">Nom : {user.name}</p>
            <p className="mt-2 text-gray-700">Email : {user.email}</p>
            <p className="mt-2 text-gray-700">Rôle : {user.role}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6">
            <h2 className="text-2xl font-semibold">Accès rapide</h2>
            <ul className="mt-4 space-y-3 text-gray-700">
              <li><Link to="/profile" className="font-semibold text-green-700 hover:text-green-900">Mon profil</Link></li>
              {(user.role === 'admin' || user.role === 'bibliothecaire') && (
                <li><Link to="/dashboard" className="font-semibold text-green-700 hover:text-green-900">Tableau de bord</Link></li>
              )}
              {user.role === 'admin' && (
                <li><Link to="/users" className="font-semibold text-green-700 hover:text-green-900">Gestion des usagers</Link></li>
              )}
              <li>
                <Link to="/loans" className="font-semibold text-green-700 hover:text-green-900">{(user.role === 'admin' || user.role === 'bibliothecaire') ? 'Gestion des prêts' : 'Mes emprunts'}</Link>
              </li>
              <li>
                <Link to="/reservations" className="font-semibold text-green-700 hover:text-green-900">{(user.role === 'admin' || user.role === 'bibliothecaire') ? 'Gestion des réservations' : 'Mes réservations'}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-green-900">Mettre à jour mes identifiants</h2>
              <p className="text-sm text-gray-700 mt-2">Mettez à jour vos coordonnées et votre mot de passe en toute sécurité.</p>
            </div>
          </div>
          <form onSubmit={handleUpdate} className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-1">Nom complet</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-green-200 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-green-200 px-4 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Nouveau mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-green-200 px-4 py-2" placeholder="Laisser vide pour garder l’ancien" />
            </div>
            {message && <div className="md:col-span-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-800">{message}</div>}
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-full bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
