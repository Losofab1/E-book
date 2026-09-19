import { Layers, Podcast, UserPlus } from "lucide-react"
import { Link } from 'react-router-dom'

const Presentat = () => {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center px-4 py-10 text-center sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl bg-green-700 px-6 py-14 text-white shadow-xl sm:px-12">
        <h1 className="text-4xl font-bold sm:text-5xl">Bienvenue sur notre plateforme</h1>
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-white p-8 text-gray-900 shadow-xl sm:p-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">La bibliothèque <span className="font-bold">LOSO<span className="text-yellow-500">FAB</span></span> à votre service !</h2>
          <p className="mt-6 text-base leading-8 text-gray-700">
            Le Savoir, sans limites ni frontières. Votre BU vous accompagne, sur le campus et à domicile.
            De la thèse d'archives aux dernières revues scientifiques numériques, bénéficiez d'un accès illimité aux sources les plus fiables.
            Notre mission : transformer la surcharge d'information en connaissance exploitable.
            Accès Nomade : vos revues et e-books accessibles partout, tout le temps.
            Prêt Illimité : empruntez, apprenez, progressez.
            Accompagnement : des bibliothécaires experts pour booster vos recherches bibliographiques.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/register" className="rounded-lg bg-yellow-400 px-8 py-3 text-lg font-semibold text-green-900 transition hover:bg-yellow-300">Inscrivez vous ici</Link>
          </div>
        </div>
      </div>

      <div className="mt-20 w-full">
        <h2 className="text-3xl font-bold text-green-800 sm:text-4xl">Présentation</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-white p-8 text-gray-900 shadow-lg">
            <h4 className="mb-5 flex items-center justify-center gap-3 text-2xl font-semibold"><Podcast /> Abonnés</h4>
            <p className="leading-7 text-gray-600">
              Plus qu'une bibliothèque, un réseau actif. Avec plus de 450 réservations traitées chaque semaine, nos abonnés profitent d'un système de gestion en temps réel.
            </p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-white p-8 text-gray-900 shadow-lg">
            <h4 className="mb-5 flex items-center justify-center gap-3 text-2xl font-semibold"><UserPlus /> Services</h4>
            <p className="leading-7 text-gray-600">
              Nous transformons votre gestion manuelle en un système numérique performant, avec informatisation du fonds, sécurité des données et outils d’administration évolutifs.
            </p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-white p-8 text-gray-900 shadow-lg">
            <h4 className="mb-5 flex items-center justify-center gap-3 text-2xl font-semibold"><Layers /> Stocks</h4>
            <p className="leading-7 text-gray-600">
              Un catalogue riche et diversifié : notre base gère plus de 1700 références actives. La recherche parmi des milliers de titres reste rapide et intuitive.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Presentat