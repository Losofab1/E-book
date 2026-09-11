import { BarChart3, TrendingUp, FileText, BookOpen, Users, CalendarCheck } from "lucide-react"
import { useEffect, useState } from 'react'

type Loan = { id: string; book: string }
type Book = { title: string }
type StoredUser = { name: string; email: string }
type Reservation = { id: string; userEmail: string }

const Dashboard = () => {
  const [totalLoans, setTotalLoans] = useState(0)
  const [totalBooks, setTotalBooks] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalApprovedRequests, setTotalApprovedRequests] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const [totalReservations, setTotalReservations] = useState(0)
  const [uniqueReservationUsers, setUniqueReservationUsers] = useState(0)

  useEffect(() => {
    try {
      const rawLoans = localStorage.getItem('losofab_loans')
      const loans: Loan[] = rawLoans ? JSON.parse(rawLoans) : []
      setTotalLoans(loans.length)

      const rawBooks = localStorage.getItem('losofab_books')
      const books: Book[] = rawBooks ? JSON.parse(rawBooks) : []
      setTotalBooks(books.length)

      const rawUsers = localStorage.getItem('losofab_users')
      const users: StoredUser[] = rawUsers ? JSON.parse(rawUsers) : []
      setTotalUsers(users.length)

      const rawRequests = localStorage.getItem('losofab_loan_requests')
      const requests = rawRequests ? JSON.parse(rawRequests) : []
      setTotalRequests(requests.length)
      setTotalApprovedRequests(requests.filter((r: any) => r.status === 'approved').length)

      const rawReservations = localStorage.getItem('losofab_reservations')
      const reservations: Reservation[] = rawReservations ? JSON.parse(rawReservations) : []
      setTotalReservations(reservations.length)
      const uniqueEmails = new Set(reservations.map((r) => r.userEmail))
      setUniqueReservationUsers(uniqueEmails.size)
    } catch {
      // ignore
    }
  }, [])

  const returnRate = totalRequests > 0 ? Math.round((totalApprovedRequests / totalRequests) * 100) : 0
  const booksInLoanRate = totalBooks > 0 ? Math.round((totalLoans / totalBooks) * 100) : 0

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-gray-900">
      <div className="mb-8 rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-green-700">Piloter la bibliothèque</p>
            <h1 className="text-4xl font-bold">Tableau de bord</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Statistiques, rapports et indicateurs clefs pour piloter le service documentaire comme un pro.</p>
          </div>
          <button className="rounded-full bg-green-700 px-5 py-3 text-white transition hover:bg-green-800">Exporter un rapport</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <BarChart3 size={24} />
          </div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Ouvrages empruntés</p>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{totalLoans.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <TrendingUp size={24} />
          </div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Demandes approuvées</p>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{returnRate} %</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <FileText size={24} />
          </div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Membres inscrits</p>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{totalUsers}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <BookOpen size={24} />
          </div>
          <h2 className="text-2xl font-semibold">Collection</h2>
          <p className="mt-4 text-gray-600">{totalBooks} ouvrages référencés au catalogue</p>
          <p className="mt-2 text-gray-600">{totalLoans} ouvrages actuellement en prêt</p>
          <p className="mt-2 text-gray-600">Taux d'occupation : {booksInLoanRate}%</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <CalendarCheck size={24} />
          </div>
          <h2 className="text-2xl font-semibold">Réservations</h2>
          <p className="mt-4 text-gray-600">{totalReservations} réservations en attente</p>
          <p className="mt-2 text-gray-600">{uniqueReservationUsers} usagers en file d'attente</p>
          <p className="mt-2 text-gray-600">{totalApprovedRequests} demandes de prêt approuvées</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <Users size={24} />
          </div>
          <h2 className="text-2xl font-semibold">Usagers</h2>
          <p className="mt-4 text-gray-600">{totalUsers} membres enregistrés</p>
          <p className="mt-2 text-gray-600">{totalRequests} demandes de prêt soumises</p>
          <p className="mt-2 text-gray-600">{totalLoans} prêts en cours</p>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
