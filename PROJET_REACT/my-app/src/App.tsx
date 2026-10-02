import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Footers from './Components/footers.tsx'
import NavBar from './Components/NavBar.tsx'
import Home from './Pages/Home.tsx'
import Consulter from './Pages/Consulter.tsx'
import Catalog from './Pages/Catalog.tsx'
import Users from './Pages/Users.tsx'
import Loans from './Pages/Loans.tsx'
import Reservations from './Pages/Reservations.tsx'
import Dashboard from './Pages/Dashboard.tsx'
import Login from './Pages/Login.tsx'
import Register from './Pages/Register.tsx'
import ForgotPassword from './Pages/ForgotPassword.tsx'
import ResetPassword from './Pages/ResetPassword.tsx'
import Profile from './Pages/Profile.tsx'
import { AuthProvider } from './AuthContext'
import RequireAuth from './RequireAuth'
import BackToTop from './Components/BackToTop'
import ErrorBoundary from './Components/ui/ErrorBoundary'

const NotFound = () => (
  <section className="page">
    <div className="card mt-6 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-600">L’adresse demandée n’existe pas.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link to="/" className="btn-primary">Accueil</Link>
        <Link to="/consulter" className="btn-outline">Consulter le catalogue</Link>
      </div>
    </div>
  </section>
)

const PageCrash = () => {
  // Dernier filet : au lieu d'une page d'erreur bloquante, on ramène
  // automatiquement à l'accueil (une seule fois, anti-boucle).
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (location.pathname === '/') return
    try {
      if (sessionStorage.getItem('losofab_crash_rescue') === '1') return
      sessionStorage.setItem('losofab_crash_rescue', '1')
    } catch {
      /* stockage indisponible */
    }
    navigate('/', { replace: true })
  }, [location.pathname, navigate])
  useEffect(() => {
    try {
      sessionStorage.removeItem('losofab_crash_rescue')
    } catch {
      /* stockage indisponible */
    }
  }, [location.pathname])
  return (
    <section className="page">
      <div className="card mx-auto mt-6 max-w-xl text-center">
        <h1 className="text-2xl font-bold">Un instant…</h1>
        <p className="mt-2 text-sm text-slate-600">Retour à l’accueil en cours.</p>
        <div className="mt-4 flex justify-center">
          <Link to="/" className="btn-primary min-h-[44px] px-8 text-sm">Accueil</Link>
        </div>
      </div>
    </section>
  )
}

const AppRoutes = () => {
  // La barrière se réarme à chaque navigation : fini le cul-de-sac qui
  // obligeait à recharger toute la page après une erreur d'affichage.
  const location = useLocation()
  return (
    <ErrorBoundary fallback={<PageCrash />} resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/consulter" element={<Consulter />} />
        <Route path="/catalog" element={<RequireAuth allowedRole={['admin', 'bibliothecaire']}><Catalog /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth allowedRole={['admin', 'bibliothecaire']}><Dashboard /></RequireAuth>} />
        <Route path="/users" element={<RequireAuth allowedRole="admin"><Users /></RequireAuth>} />
        <Route path="/loans" element={<RequireAuth><Loans /></RequireAuth>} />
        <Route path="/reservations" element={<RequireAuth><Reservations /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-100">
        <Router>
          <NavBar />

          <main className="pt-24">
            <AppRoutes />
          </main>

          <Footers />
          <BackToTop />
        </Router>
      </div>
    </AuthProvider>
  )
}

export default App
