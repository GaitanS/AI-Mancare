import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Cookies',
  description: 'Politica de utilizare a cookie-urilor pe platforma CatalogSmart. Aflati ce cookies folosim si cum le puteti gestiona.',
  alternates: {
    canonical: '/cookies',
  },
  openGraph: {
    title: 'Politica de Cookies',
    description: 'Informatii despre cookie-urile utilizate pe CatalogSmart.',
    type: 'website',
    url: '/cookies',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

        <div className="container-custom py-8 sm:py-12 relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 font-heading">
            Politica de Cookies
          </h1>
          <p className="text-white/80 font-body text-sm sm:text-base">
            Ultima actualizare: Decembrie 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 md:p-10">
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">1. Ce sunt Cookie-urile?</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Cookie-urile sunt fisiere text de mici dimensiuni care sunt stocate pe dispozitivul dumneavoastra
                  (computer, telefon mobil, tableta) atunci cand vizitati un website. Acestea permit site-ului sa
                  va &quot;recunoasca&quot; si sa isi aminteasca preferintele dumneavoastra.
                </p>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Cookie-urile sunt utilizate pe scara larga pentru a face site-urile web sa functioneze mai eficient
                  si pentru a furniza informatii proprietarilor site-ului.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">2. Tipuri de Cookie-uri Utilizate</h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">2.1 Cookie-uri Esentiale (Strict Necesare)</h3>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Aceste cookie-uri sunt necesare pentru functionarea site-ului si nu pot fi dezactivate.
                  De obicei sunt setate doar ca raspuns la actiunile dumneavoastra, cum ar fi setarea
                  preferintelor de confidentialitate sau completarea formularelor.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-semibold text-foreground">Cookie</th>
                        <th className="text-left py-2 font-semibold text-foreground">Scop</th>
                        <th className="text-left py-2 font-semibold text-foreground">Durata</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/80">
                      <tr className="border-b border-gray-100">
                        <td className="py-2">cookie_consent</td>
                        <td className="py-2">Stocheaza preferintele de consimtamant cookies</td>
                        <td className="py-2">1 an</td>
                      </tr>
                      <tr>
                        <td className="py-2">session_id</td>
                        <td className="py-2">Identificator de sesiune</td>
                        <td className="py-2">Sesiune</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">2.2 Cookie-uri de Performanta si Analiza</h3>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Aceste cookie-uri ne permit sa numaram vizitele si sursele de trafic pentru a putea masura
                  si imbunatati performanta site-ului. Ne ajuta sa stim care pagini sunt cele mai populare
                  si sa vedem cum navigheaza vizitatorii pe site.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-semibold text-foreground">Cookie</th>
                        <th className="text-left py-2 font-semibold text-foreground">Furnizor</th>
                        <th className="text-left py-2 font-semibold text-foreground">Durata</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/80">
                      <tr className="border-b border-gray-100">
                        <td className="py-2">_ga</td>
                        <td className="py-2">Google Analytics</td>
                        <td className="py-2">2 ani</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2">_ga_*</td>
                        <td className="py-2">Google Analytics</td>
                        <td className="py-2">2 ani</td>
                      </tr>
                      <tr>
                        <td className="py-2">_gid</td>
                        <td className="py-2">Google Analytics</td>
                        <td className="py-2">24 ore</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">2.3 Cookie-uri de Functionare</h3>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Aceste cookie-uri permit site-ului sa ofere functionalitati si personalizare sporite,
                  cum ar fi memorarea preferintelor dumneavoastra (magazin favorit, tema de culoare, etc.).
                </p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-semibold text-foreground">Cookie</th>
                        <th className="text-left py-2 font-semibold text-foreground">Scop</th>
                        <th className="text-left py-2 font-semibold text-foreground">Durata</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/80">
                      <tr className="border-b border-gray-100">
                        <td className="py-2">preferred_stores</td>
                        <td className="py-2">Magazinele favorite selectate</td>
                        <td className="py-2">1 an</td>
                      </tr>
                      <tr>
                        <td className="py-2">filter_preferences</td>
                        <td className="py-2">Preferintele de filtrare salvate</td>
                        <td className="py-2">30 zile</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">3. Gestionarea Cookie-urilor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Puteti controla si/sau sterge cookie-urile dupa preferintele dumneavoastra. Aveti urmatoarele optiuni:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">3.1 Prin setarile browser-ului</h3>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Majoritatea browserelor permit controlul cookie-urilor prin setari. Iata linkuri catre instructiunile pentru browserele populare:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Google Chrome:</strong> Setari &gt; Confidentialitate si securitate &gt; Cookie-uri</li>
                  <li><strong>Mozilla Firefox:</strong> Optiuni &gt; Confidentialitate si securitate &gt; Cookie-uri</li>
                  <li><strong>Safari:</strong> Preferinte &gt; Confidentialitate &gt; Gestionare date site</li>
                  <li><strong>Microsoft Edge:</strong> Setari &gt; Cookie-uri si permisiuni site</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">3.2 Dezactivarea Google Analytics</h3>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Pentru a dezactiva urmarirea Google Analytics pe toate site-urile, puteti instala
                  <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 ml-1">
                    extensia de browser Google Analytics Opt-out
                  </a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">4. Consecintele Dezactivarii Cookie-urilor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Daca alegeti sa dezactivati cookie-urile, unele functionalitati ale site-ului pot sa nu functioneze corect:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Preferintele dumneavoastra nu vor fi salvate</li>
                  <li>Este posibil sa vedeti bannerul de consimtamant la fiecare vizita</li>
                  <li>Unele functii de personalizare nu vor fi disponibile</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">5. Cookie-uri de la Terti</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Unele servicii terte pe care le utilizam pot seta propriile cookie-uri. Acestea includ:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Google Analytics:</strong> pentru analiza traficului</li>
                  <li><strong>Vercel Analytics:</strong> pentru monitorizarea performantei site-ului</li>
                </ul>
                <p className="text-foreground/80 font-body leading-relaxed mt-4">
                  Nu avem control asupra cookie-urilor setate de acesti furnizori terti.
                  Va recomandam sa consultati politicile lor de confidentialitate pentru mai multe informatii.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">6. Actualizari ale Politicii</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Aceasta politica poate fi actualizata periodic pentru a reflecta modificari in practicile noastre
                  sau din motive operationale, legale sau de reglementare. Va incurajam sa revisitati periodic
                  aceasta pagina pentru a fi la curent cu utilizarea cookie-urilor.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">7. Contact</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Pentru intrebari despre utilizarea cookie-urilor pe site-ul nostru:
                </p>
                <ul className="list-none mt-4 space-y-2 text-foreground/80 font-body">
                  <li><strong>Email:</strong> privacy@catalogsmart.ro</li>
                  <li><strong>Pagina de contact:</strong> <a href="/contact" className="text-primary-600 hover:text-primary-700">/contact</a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
