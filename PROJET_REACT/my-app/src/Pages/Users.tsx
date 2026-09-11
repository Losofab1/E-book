import { useState } from 'react'
import { UserPlus, BadgeCheck, ShieldCheck, Trash2, PlusCircle } from 'lucide-react'
import { useAuth } from '../AuthContext'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import StatusBadge from '../Components/ui/StatusBadge'

type Role = 'admin' | 'bibliothecaire' | 'etudiant' | 'professeur' | 'externe'

const Users = () => {
  const auth = useAuth()
  const [usersList, setUsersList] = useState(() => auth.getAllUsers())

  // Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('etudiant')
  const [message, setMessage] = useState('')

  const refreshUsers = () => {
    setUsersList(auth.getAllUsers())
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      setMessage('Veuillez remplir tous les champs.')
      return
    }

    const success = await auth.adminRegisterUser(name, email, password, role)
    if (success) {
      const createdName = name
      setName('')
      setEmail('')
      setPassword('')
      setRole('etudiant')
      setMessage(`✅ Membre "${createdName}" enregistré avec succès dans la liste ci-dessous !`)
      refreshUsers()
      alert(`Le membre "${createdName}" a bien été enregistré ! Vous pouvez désormais voir son profil dans le tableau des usagers.`)
    } else {
      setMessage('❌ Cet email est déjà utilisé par un autre compte.')
    }
  }

  const handleDeleteUser = async (userEmail: string) => {
    if (userEmail.toLowerCase() === 'admin@losofab') {
      alert('Impossible de supprimer le compte administrateur principal.')
      return
    }
    if (confirm(`Voulez-vous vraiment supprimer le compte ${userEmail} ?`)) {
      await auth.deleteUser(userEmail)
      refreshUsers()
    }
  }

  const columns: TableColumn<typeof usersList[number]>[] = [
    { key: 'name', label: 'Nom', className: 'font-semibold text-gray-900' },
    { key: 'email', label: 'Email', className: 'text-gray-600' },
    { key: 'role', label: 'Type (Rôle)', className: 'font-bold uppercase text-green-700' },
    {
      key: 'status',
      label: 'Statut',
      render: (userItem) => (
        <StatusBadge
          label={userItem.status}
          variant={userItem.status === 'actif' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'email',
      label: 'Actions',
      render: (userItem) =>
        userItem.email.toLowerCase() !== 'admin@losofab' ? (
          <button
            onClick={() => handleDeleteUser(userItem.email)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-gray-900">
      <div className="mb-8 rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-green-700">Gestion des usagers</p>
            <h1 className="text-4xl font-bold">Membres et abonnements</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Créez des profils, gérez les types d’abonnement et suivez les statuts des utilisateurs.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-3 text-white transition hover:bg-green-800"
          >
            <PlusCircle size={20} />
            {showAddForm ? 'Fermer le formulaire' : 'Nouveau membre'}
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800 border border-green-200">
            {message}
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleCreateUser} className="mt-6 rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-inner space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Inscrire un nouveau membre</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-1">Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Aubin JOHN"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: aubin@gmail.com"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Type de membre (Rôle)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                >
                  <option value="etudiant">Étudiant</option>
                  <option value="professeur">Professeur</option>
                  <option value="externe">Externe</option>
                  <option value="bibliothecaire">Bibliothécaire</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="rounded-full bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Enregistrer le membre
            </button>
          </form>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-cyan-50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <UserPlus size={24} className="text-cyan-700" />
            </div>
            <h2 className="text-xl font-semibold">Profils</h2>
            <p className="mt-2 text-sm text-gray-600">Inscription, suivi des profils et gestion des contacts.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-orange-50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <BadgeCheck size={24} className="text-orange-700" />
            </div>
            <h2 className="text-xl font-semibold">Abonnements</h2>
            <p className="mt-2 text-sm text-gray-600">Étudiant, professeur, externe : définissez des plafonds et durées de prêt.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-violet-50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <ShieldCheck size={24} className="text-violet-700" />
            </div>
            <h2 className="text-xl font-semibold">Sécurité</h2>
            <p className="mt-2 text-sm text-gray-600">Rôles, permissions et accès pour les bibliothécaires et administrateurs.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/95 p-8 shadow-2xl">
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {[
            { label: "Membres enregistrés", value: usersList.length.toString() },
            { label: "Profils actifs", value: usersList.filter(u => u.status === 'actif').length.toString() },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <DataTable
            columns={columns}
            data={usersList}
            rowKey={(userItem) => userItem.email}
            emptyMessage="Aucun membre enregistré pour le moment."
          />
        </div>
      </div>
    </section>
  )
}

export default Users
