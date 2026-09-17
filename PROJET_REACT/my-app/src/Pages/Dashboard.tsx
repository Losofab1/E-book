import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { bookService } from '../services/bookService'

const Dashboard = () => {
  const [stats, setStats] = useState({ books: 0, loans: 0, reservations: 0 })
  const [error, setError] = useState('')
  useEffect(() => { void (async () => {
    try {
      const [books, loans, reservations] = await Promise.all([bookService.getAll(), api.get('/digital/loans'), api.get('/digital/reservations')])
      setStats({ books: books.data.length, loans: loans.data.length, reservations: reservations.data.length })
    } catch { setError('Impossible de charger les indicateurs du serveur.') }
  })() }, [])
  return <section className="mx-auto max-w-6xl px-4 py-10 text-slate-900"><h1 className="text-3xl font-bold">Tableau de bord</h1>{error ? <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Ouvrages', stats.books], ['Prêts', stats.loans], ['Réservations', stats.reservations]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white p-5 shadow"><p className="text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>}</section>
}
export default Dashboard
