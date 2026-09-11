import { Layers, Podcast, UserPlus } from "lucide-react"
import { Link } from 'react-router-dom'

const Presentat = () => {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center px-4 py-10 text-center text-white">
      <div className="w-full rounded-[3rem] bg-purple-200/40 px-6 py-14 shadow-2xl backdrop-blur-xl sm:px-12">
        <h1 className="text-5xl font-bold">Bienvenue sur notre plateforme</h1>
        <div className="mx-auto mt-10 max-w-4xl rounded-3xl bg-white/90 p-10 text-gray-900 shadow-2xl">
          <h2 className="text-3xl font-semibold">La bibliothèque <span className="font-bold">LOSO<span className="text-yellow-500">FAB</span></span> à votre service !</h2>
          <p className="mt-6 text-base leading-8 text-gray-700 text-size-25px">
            Le Savoir, sans limites ni frontières. Votre BU vous accompagne, sur le campus et à domicile.
            De la thèse d'archives aux dernières revues scientifiques numériques, bénéficiez d'un accès illimité aux sources les plus fiables.
            Notre mission : transformer la surcharge d'information en connaissance exploitable.
            Accès Nomade : vos revues et e-books accessibles partout, tout le temps.
            Prêt Illimité : empruntez, apprenez, progressez.
            Accompagnement : des bibliothécaires experts pour booster vos recherches bibliographiques.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/register" className="rounded-full bg-yellow-500 px-8 py-3 text-2xl font-semibold text-white transition hover:bg-yellow-600">Inscrivez vous ici</Link>
          </div>
        </div>
      </div>

      <div className="mt-20 w-full">
        <h2 className="text-4xl font-bold text-white-500/50">Présentation</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 text-gray-900 shadow-xl">
            <h4 className="mb-5 flex items-center justify-center gap-3 text-2xl font-semibold"><Podcast /> Abonnés</h4>
            <p className="leading-7 text-gray-600">
              Plus qu'une bibliothèque, un réseau actif. Avec plus de 450 réservations traitées chaque semaine, nos abonnés profitent d'un système de gestion en temps réel.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-8 text-gray-900 shadow-xl">
            <h4 className="mb-5 flex items-center justify-center gap-3 text-2xl font-semibold"><UserPlus /> Services</h4>
            <p className="leading-7 text-gray-600">
              Nous transformons votre gestion manuelle en un système numérique performant, avec informatisation du fonds, sécurité des données et outils d’administration évolutifs.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-8 text-gray-900 shadow-xl">
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