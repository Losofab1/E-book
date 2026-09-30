import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText, CalendarClock, UserRound } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { loanService } from '../services/loanService'
import { reservationService } from '../services/reservationService'
import { catalogCirculationService } from '../services/catalogCirculationService'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'

const roleLabels = {
  admin: 'Administrateur',
  bibliothecaire: 'Bibliothécaire',
  etudiant: 'Étudiant',
  professeur: 'Professeur',
  adherent: 'Adhérent',
} as const

const countByStatus = (result: PromiseSettledResult<{ data?: unknown }>, statuses: string[]): number => {
  if (result.status !== 'fulfilled' || !Array.isArray(result.value.data)) return 0
  return (result.value.data as { status?: string }[]).filter((row) => statuses.includes(String(row.status))).length
}

const Profile = () => {
  const auth = useAuth()
  const user = auth.user
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [updateOk, setUpdateOk] = useState(false)
  const [activity, setActivity] = useState<{ loans: number; reservations: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadActivity = async () => {
      const [loansResult, reservationsResult, documentLoansResult, documentReservationsResult] = await Promise.allSettled([
        loanService.getAll(),
        reservationService.getAll(),
        catalogCirculationService.getLoans(),
        catalogCirculationService.getReservations(),
      ])
      if (cancelled) return
      setActivity({
        loans: countByStatus(loansResult, ['BORROWED']) + countByStatus(documentLoansResult, ['BORROWED']),
        reservations:
          countByStatus(reservationsResult, ['WAITING', 'READY_FOR_PICKUP']) +
          countByStatus(documentReservationsResult, ['WAITING', 'READY_FOR_PICKUP']),
      })
    }
    void loadActivity()
    return () => { cancelled = true }
  }, [])

  if (!user) return null

  const staff = user.role === 'admin' || user.role === 'bibliothecaire'

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    const success = await auth.updateCredentials({
      name,
      email,
      password: password.trim() ? password : undefined,
    })

    if (success) {
      setUpdateOk(true)
      setMessage('Identifiants mis à jour avec succès.')
      setPassword('')
    } else {
      setUpdateOk(false)
      setMessage('Erreur lors de la mise à jour des identifiants.')
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Compte"
        title="Espace personnel"
        description={`Bienvenue, ${user.name}. Retrouvez votre activité, vos accès et vos identifiants.`}
        extra={<StatusBadge label={roleLabels[user.role]} variant="info" />}
      />

      {activity && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link to="/loans" className="card flex items-center gap-4 transition hover:border-primary-300">
            <span className="rounded-xl bg-primary-100 p-3 text-primary-800"><BookOpenText size={22} /></span>
            <span>
              <span className="block text-2xl font-bold">{activity.loans}</span>
              <span className="text-sm text-slate-600">{staff ? 'Prêts en cours (tous usagers)' : 'Mes prêts en cours'}</span>
            </span>
          </Link>
          <Link to="/reservations" className="card flex items-center gap-4 transition hover:border-primary-300">
            <span className="rounded-xl bg-primary-100 p-3 text-primary-800"><CalendarClock size={22} /></span>
            <span>
              <span className="block text-2xl font-bold">{activity.reservations}</span>
              <span className="text-sm text-slate-600">{staff ? 'Réservations actives (tous usagers)' : 'Mes réservations actives'}</span>
            </span>
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xl font-bold text-white">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">Mes informations</h2>
              <p className="truncate text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Nom</dt><dd className="font-semibold">{user.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Email</dt><dd className="truncate font-semibold">{user.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Rôle</dt><dd className="font-semibold">{roleLabels[user.role]}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold">Accès rapide</h2>
          <div className="mt-4 grid gap-2">
            {(user.role === 'admin' || user.role === 'bibliothecaire') && (
              <Link to="/dashboard" className="btn-outline justify-start">Tableau de bord</Link>
            )}
            {user.role === 'admin' && (
              <Link to="/users" className="btn-outline justify-start">Gestion des usagers</Link>
            )}
            <Link to="/loans" className="btn-outline justify-start">{staff ? 'Gestion des prêts' : 'Mes emprunts'}</Link>
            <Link to="/reservations" className="btn-outline justify-start">{staff ? 'Gestion des réservations' : 'Mes réservations'}</Link>
            <Link to="/catalog" className="btn-outline justify-start">Catalogue</Link>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary-100 p-2 text-primary-800"><UserRound size={20} /></span>
          <div>
            <h2 className="text-xl font-bold">Mettre à jour mes identifiants</h2>
            <p className="text-sm text-slate-600">Mettez à jour vos coordonnées et votre mot de passe en toute sécurité.</p>
          </div>
        </div>
        <form onSubmit={handleUpdate} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">Nom complet</label>
            <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-2 block text-sm font-semibold">Email</label>
            <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="profile-password" className="mb-2 block text-sm font-semibold">Nouveau mot de passe</label>
            <input id="profile-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Laisser vide pour garder l’ancien" />
          </div>
          {message && <div className="md:col-span-2"><Alert variant={updateOk ? 'success' : 'error'}>{message}</Alert></div>}
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default Profile
