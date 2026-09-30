import { useEffect, useState, type FormEvent } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { api } from '../services/api'
import DataTable, { type TableColumn } from '../Components/ui/DataTable'
import PageHeader from '../Components/ui/PageHeader'
import Alert from '../Components/ui/Alert'
import StatusBadge from '../Components/ui/StatusBadge'

type Role = 'ADMIN' | 'BIBLIOTHECAIRE' | 'ETUDIANT' | 'PROFESSEUR' | 'ADHERENT'
type User = { id: number; name: string; email: string; role: Role; actif: boolean }

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrateur',
  BIBLIOTHECAIRE: 'Bibliothécaire',
  ETUDIANT: 'Étudiant',
  PROFESSEUR: 'Professeur',
  ADHERENT: 'Adhérent',
}

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

  const userColumns: TableColumn<User>[] = [
    { key: 'name', label: 'Nom', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle', render: (row) => roleLabels[row.role] },
    {
      key: 'status',
      label: 'Statut',
      render: (row) => (row.actif
        ? <StatusBadge label="Actif" variant="success" />
        : <StatusBadge label="Désactivé" variant="neutral" />),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (row.actif
        ? <button type="button" onClick={() => void deactivate(row)} aria-label={`Désactiver ${row.name}`} className="text-red-700 hover:text-red-900"><Trash2 size={18} /></button>
        : null),
    },
  ]

  return (
    <section className="page">
      <PageHeader
        eyebrow="Administration"
        title="Gestion des utilisateurs"
        description="Les comptes sont gérés par le serveur et persistent dans la base de données."
      />
      <form onSubmit={createUser} className="card mt-6 grid gap-3 md:grid-cols-5">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="input" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" />
        <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="input" />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
          <option value="ADHERENT">Adhérent</option><option value="ETUDIANT">Étudiant</option><option value="PROFESSEUR">Professeur</option><option value="BIBLIOTHECAIRE">Bibliothécaire</option><option value="ADMIN">Administrateur</option>
        </select>
        <button type="submit" className="btn-primary"><UserPlus size={18} />Créer</button>
      </form>
      {message && <Alert>{message}</Alert>}
      <div className="table-card mt-6">
        <DataTable
          columns={userColumns}
          data={users}
          emptyMessage="Aucun utilisateur."
          rowKey={(row) => String(row.id)}
        />
      </div>
    </section>
  )
}

export default Users
