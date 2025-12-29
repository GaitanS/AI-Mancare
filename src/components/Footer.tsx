import Link from 'next/link';

const footerLinks = {
  magazine: [
    { name: 'Kaufland', href: '/oferte/kaufland' },
    { name: 'Lidl', href: '/oferte/lidl' },
    { name: 'Penny', href: '/oferte/penny' },
    { name: 'Carrefour', href: '/oferte/carrefour' },
    { name: 'Mega Image', href: '/oferte/mega-image' },
    { name: 'Auchan', href: '/oferte/auchan' },
  ],
  categorii: [
    { name: 'Carne si Mezeluri', href: '/oferte?category=carne' },
    { name: 'Lactate', href: '/oferte?category=lactate' },
    { name: 'Legume si Fructe', href: '/oferte?category=legume-fructe' },
    { name: 'Bauturi', href: '/oferte?category=bauturi' },
    { name: 'Dulciuri', href: '/oferte?category=dulciuri' },
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
    <footer className="bg-gray-900 text-gray-300" role="contentinfo">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">
                Retete <span className="text-primary-400">Ieftine</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">
              Descopera cele mai bune oferte din supermarketuri si gateste retete
              delicioase la preturi accesibile.
            </p>
          </div>

          {/* Magazine Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Magazine
            </h3>
            <ul className="space-y-2">
              {footerLinks.magazine.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categorii Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Categorii
            </h3>
            <ul className="space-y-2">
              {footerLinks.categorii.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Retete Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Retete
            </h3>
            <ul className="space-y-2">
              {footerLinks.retete.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Informatii
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; {currentYear} Retete Ieftine. Toate drepturile rezervate.
            </p>
            <p className="text-xs text-gray-500">
              Preturile si disponibilitatea produselor pot varia. Verificati ofertele in
              magazin.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
