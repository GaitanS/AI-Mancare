import Link from 'next/link';

const footerLinks = {
  magazine: [
    { name: 'Kaufland', href: '/cataloage/kaufland' },
    { name: 'Lidl', href: '/cataloage/lidl' },
    { name: 'Penny', href: '/cataloage/penny' },
    { name: 'Carrefour', href: '/cataloage/carrefour' },
    { name: 'Mega Image', href: '/cataloage/mega-image' },
    { name: 'Auchan', href: '/cataloage/auchan' },
  ],
  categorii: [
    { name: 'Carne si Mezeluri', href: '/cataloage?category=carne' },
    { name: 'Lactate', href: '/cataloage?category=lactate' },
    { name: 'Legume si Fructe', href: '/cataloage?category=legume-fructe' },
    { name: 'Bauturi', href: '/cataloage?category=bauturi' },
    { name: 'Dulciuri', href: '/cataloage?category=dulciuri' },
  ],
  retete: [
    { name: 'Retete Usoare', href: '/retete?difficulty=USOR' },
    { name: 'Retete Rapide', href: '/retete?maxTime=30' },
    { name: 'Sub 20 lei', href: '/retete?maxCost=20' },
    { name: 'Toate Retetele', href: '/retete' },
  ],
  legal: [
    { name: 'Termeni si Conditii', href: '/termeni' },
    { name: 'Politica de Confidentialitate', href: '/confidentialitate' },
    { name: 'Cookies', href: '/cookies' },
    { name: 'Contact', href: '/contact' },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-900 text-neutral-300 overflow-hidden" role="contentinfo">
      {/* Kitchen pattern overlay */}
      <div className="absolute inset-0 pattern-kitchen opacity-5" />

      {/* Warm accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary-500/10 rounded-full filter blur-[100px]" />

      <div className="relative container-custom py-16 md:py-20">
        {/* Newsletter Section */}
        <div className="mb-16 pb-16 border-b border-neutral-700/50">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
              Primeste cele mai bune oferte
            </h3>
            <p className="text-neutral-400 mb-6">
              Aboneaza-te pentru a primi notificari despre cele mai bune reduceri si retete noi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Adresa ta de email"
                className="flex-1 px-5 py-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
              />
              <button className="px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 shadow-warm transition-all duration-300 whitespace-nowrap">
                Aboneaza-te
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
              <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-warm group-hover:shadow-lg transition-shadow">
                {/* Kitchen pot icon */}
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <span className="flex items-baseline gap-1">
                <span className="text-xl font-display font-bold text-white">Catalog</span>
                <span className="text-xl font-display font-bold text-primary-400">Smart</span>
              </span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
              Descopera cele mai bune oferte din supermarketuri si gateste retete
              delicioase la preturi accesibile.
            </p>
          </div>

          {/* Magazine Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Magazine
            </h4>
            <ul className="space-y-3">
              {footerLinks.magazine.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-primary-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categorii Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Categorii
            </h4>
            <ul className="space-y-3">
              {footerLinks.categorii.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-primary-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Retete Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Retete
            </h4>
            <ul className="space-y-3">
              {footerLinks.retete.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-accent-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Informatii
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-neutral-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">
              &copy; {currentYear} CatalogSmart. Toate drepturile rezervate.
            </p>
            <p className="text-xs text-neutral-600 text-center md:text-right max-w-lg">
              Preturile si disponibilitatea produselor pot varia. Verificati ofertele in magazin inainte de cumparare.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
    </footer>
  );
}
