import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-100">
        <Router>
          <NavBar />

          <main className="pt-36">
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
            </Routes>
          </main>

          <Footers />
          <BackToTop />
        </Router>
      </div>
    </AuthProvider>
  )
}

export default App
