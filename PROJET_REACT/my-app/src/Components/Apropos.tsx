import { BookCopy } from "lucide-react"
import gemo3Img from '../assets/gemo3.png'
const Apropos = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-6xl flex-col gap-8 md:flex-row">
        <section className="rounded-3xl bg-green-200 p-8 shadow-lg">
          <h2 className="text-4xl font-semibold text-center text-gray-800">Notre vision</h2>
          <p className="mt-6 text-lg leading-8 text-gray-700">
            À l'ère du numérique, la gestion du savoir doit être fluide, intuitive et accessible. LOSOFAB est né de la volonté de moderniser l'expérience bibliothécaire en offrant une solution complète qui répond aux besoins des administrateurs et des passionnés de lecture.
            Nous croyons fermement que la technologie peut simplifier l'accès à la culture et optimiser l'organisation des ressources documentaires.
          </p>
          <div className="mt-8 text-center">
            <button className="rounded-full bg-yellow-500 px-6 py-3 text-white shadow-lg transition hover:bg-yellow-600">Inscription</button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl bg-green-50 text-green-700">
            <BookCopy size={64} />
          </div>
          <h3 className="mt-6 text-3xl font-bold text-gray-700">Le monde du savoir</h3>
          <div className="mt-8 rounded-3xl bg-gray-100 p-4">
            <img src={gemo3Img} alt="bibliothèque" className="mx-auto rounded-3xl shadow-2xl" />
          </div>
        </section>
      </div>

      <section className="mt-12 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Services de proximité</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white/90 p-8 shadow-xl transition hover:shadow-green-500/20">
            <div className="mb-4 text-orange-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Catalogue en ligne</h3>
            <p className="text-gray-600">Explorez des milliers d'ouvrages, des thèses et des revues scientifiques depuis chez vous.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white/90 p-8 shadow-xl transition hover:shadow-green-500/20">
            <div className="mb-4 text-orange-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Réservation rapide</h3>
            <p className="text-gray-600">Réservez vos livres préférés en un clic et récupérez-les en priorité à la bibliothèque.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white/90 p-8 shadow-xl transition hover:shadow-green-500/20">
            <div className="mb-4 text-orange-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Accès nomade</h3>
            <p className="text-gray-600">Lisez vos e-books et consultez les ressources numériques sur tablette, smartphone ou PC.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Apropos
