import { useEffect, useState, type FormEvent } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { api } from '../services/api'

type Role = 'ADMIN' | 'BIBLIOTHECAIRE' | 'ETUDIANT' | 'PROFESSEUR' | 'ADHERENT'
type User = { id: number; name: string; email: string; role: Role; actif: boolean }

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('ADHERENT')
  const [message, setMessage] = useState('')

  const loadUsers = async () => {
    try {
      const response = await api.get<User[]>('/admin/users')
      setUsers(response.data)
    } catch {
      setMessage('Impossible de charger les utilisateurs.')
    }
  }

  useEffect(() => { void loadUsers() }, [])

  const createUser = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.post('/admin/users', { name, email, password, role })
      setName(''); setEmail(''); setPassword(''); setRole('ADHERENT')
      setMessage('Utilisateur créé avec succès.')
      await loadUsers()
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Impossible de créer cet utilisateur.')
    }
  }

  const deactivate = async (user: User) => {
    if (!window.confirm(`Désactiver le compte de ${user.name} ?`)) return
    try {
      await api.delete(`/admin/users/${user.id}`)
      setMessage('Compte désactivé.')
      await loadUsers()
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Impossible de désactiver ce compte.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 text-slate-900">
      <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
      <p className="mt-2 text-slate-600">Les comptes sont gérés par le serveur et persistent dans la base de données.</p>
      <form onSubmit={createUser} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-5">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="rounded-lg border p-2" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-lg border p-2" />
        <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="rounded-lg border p-2" />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border p-2">
          <option value="ADHERENT">Adhérent</option><option value="ETUDIANT">Étudiant</option><option value="PROFESSEUR">Professeur</option><option value="BIBLIOTHECAIRE">Bibliothécaire</option><option value="ADMIN">Administrateur</option>
        </select>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"><UserPlus size={18} />Créer</button>
      </form>
      {message && <p role="status" className="mt-4 rounded-lg bg-white p-3 shadow">{message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="min-w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Rôle</th><th className="p-3">Statut</th><th className="p-3" /></tr></thead>
          <tbody>{users.map((user) => <tr key={user.id} className="border-t"><td className="p-3">{user.name}</td><td className="p-3">{user.email}</td><td className="p-3">{user.role}</td><td className="p-3">{user.actif ? 'Actif' : 'Désactivé'}</td><td className="p-3">{user.actif && <button onClick={() => void deactivate(user)} className="text-red-700"><Trash2 size={18} /></button>}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

export default Users
