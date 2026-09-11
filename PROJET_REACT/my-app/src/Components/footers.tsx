import { BookOpenText, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react"

const Footers = () => {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Branding */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <BookOpenText size={36} strokeWidth={1} />
              <span className="text-2xl font-black">LOSO<span className="text-yellow-400">FAB</span></span>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Plateforme de gestion de bibliothèque moderne et intuitive. Accédez aux ressources documentaires depuis chez vous.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin size={16} />
                Losofab Maest
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:contact@losofab.bj" className="hover:text-white transition">contact@losofab.bj</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <a href="tel:+2290153791179" className="hover:text-white transition">+229 01 53 79 11 79</a>
              </li>
            </ul>
          </div>

          {/* Horaires */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Horaires</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Tous les jours</li>
              <li className="font-medium text-white">24h / 24h</li>
              
            </ul>
          </div>

          {/* Réseaux sociaux */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Suivez-nous</h3>
            <div className="flex gap-4">
              <a href="#" className="inline-flex items-center justify-center rounded-full bg-slate-800 p-3 hover:bg-yellow-400 hover:text-slate-900 transition">
                <Facebook size={20} />
              </a>
              <a href="#" className="inline-flex items-center justify-center rounded-full bg-slate-800 p-3 hover:bg-yellow-400 hover:text-slate-900 transition">
                <Instagram size={20} />
              </a>
              <a href="#" className="inline-flex items-center justify-center rounded-full bg-slate-800 p-3 hover:bg-yellow-400 hover:text-slate-900 transition">
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-slate-800"></div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            &copy; 2026 LOSOFAB. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition">Politique de confidentialité</a>
            <a href="#" className="hover:text-white transition">Conditions d'utilisation</a>
            <a href="#" className="hover:text-white transition">Nous contacter</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footers