import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termeni si Conditii',
  description: 'Termenii si conditiile de utilizare a platformei CatalogSmart. Cititi cu atentie inainte de a utiliza serviciile noastre.',
  alternates: {
    canonical: '/termeni',
  },
  openGraph: {
    title: 'Termeni si Conditii',
    description: 'Termenii si conditiile de utilizare a platformei CatalogSmart.',
    type: 'website',
    url: '/termeni',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermeniPage() {
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
            Termeni si Conditii
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
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">1. Acceptarea Termenilor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Prin accesarea si utilizarea platformei CatalogSmart (denumita in continuare &quot;Platforma&quot;), disponibila la adresa catalogsmart.ro,
                  acceptati in totalitate si fara rezerve acesti Termeni si Conditii. Daca nu sunteti de acord cu oricare dintre acesti termeni,
                  va rugam sa nu utilizati Platforma.
                </p>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Acesti termeni pot fi modificati periodic. Continuarea utilizarii Platformei dupa orice modificare constituie acceptarea noilor termeni.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">2. Descrierea Serviciilor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  CatalogSmart este o platforma online care:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Agrega si afiseaza oferte si promotii din supermarketuri din Romania (Kaufland, Lidl, Penny, Carrefour, Mega Image, Auchan si altele)</li>
                  <li>Prezinta retete economice bazate pe ingrediente aflate in promotie</li>
                  <li>Permite utilizatorilor sa caute si sa filtreze produse si retete</li>
                  <li>Ofera informatii despre preturi, reduceri si valabilitatea ofertelor</li>
                </ul>
                <p className="text-foreground/80 font-body leading-relaxed mt-4">
                  <strong>Important:</strong> Platforma nu vinde produse si nu intermediaza tranzactii comerciale.
                  Achizitionarea produselor se face direct din magazinele mentionate, conform termenilor si conditiilor acestora.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">3. Utilizarea Platformei</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Utilizatorii se obliga sa:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Utilizeze Platforma in mod legal si conform scopului sau</li>
                  <li>Nu incerce sa acceseze neautorizat sistemele Platformei</li>
                  <li>Nu copieze, distribuie sau utilizeze continutul in scopuri comerciale fara acordul scris prealabil</li>
                  <li>Nu publice sau transmita continut ilegal, ofensator sau daunator</li>
                  <li>Nu utilizeze Platforma pentru spam sau activitati frauduloase</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">4. Acuratetea Informatiilor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Depunem toate eforturile pentru a asigura acuratetea informatiilor prezentate. Cu toate acestea:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Preturile si disponibilitatea produselor pot varia fata de cele afisate</li>
                  <li>Ofertele au o perioada de valabilitate limitata si pot expira sau fi modificate de catre magazine</li>
                  <li>Imaginile produselor pot fi reprezentari si pot diferi de produsul real</li>
                  <li>Recomandam intotdeauna verificarea ofertelor direct in magazine</li>
                </ul>
                <p className="text-foreground/80 font-body leading-relaxed mt-4">
                  Nu ne asumam responsabilitatea pentru eventualele erori sau omisiuni in informatiile prezentate.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">5. Proprietate Intelectuala</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Tot continutul Platformei, inclusiv dar fara a se limita la texte, grafice, logo-uri, imagini,
                  design, cod sursa si baze de date, este proprietatea CatalogSmart sau a licentiatorilor sai
                  si este protejat de legile privind drepturile de autor si proprietatea intelectuala.
                </p>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Marcile comerciale ale magazinelor mentionate (Kaufland, Lidl, Penny, etc.) apartin respectivilor proprietari.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">6. Limitarea Raspunderii</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  In masura maxima permisa de lege, CatalogSmart nu va fi responsabila pentru:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Pierderile sau daunele directe, indirecte sau incidentale rezultate din utilizarea sau imposibilitatea utilizarii Platformei</li>
                  <li>Erori in informatiile privind preturile, disponibilitatea sau caracteristicile produselor</li>
                  <li>Actiunile sau omisiunile magazinelor sau ale altor terte parti</li>
                  <li>Intreruperi sau erori in functionarea Platformei</li>
                  <li>Virusi sau alte componente daunatoare transmise prin Platforma</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">7. Linkuri Externe</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Platforma poate contine linkuri catre site-uri externe. Nu avem control asupra continutului
                  acestor site-uri si nu ne asumam responsabilitatea pentru ele. Accesarea linkurilor externe
                  se face pe propria raspundere a utilizatorului.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">8. Disponibilitatea Serviciului</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Ne rezervam dreptul de a modifica, suspenda sau intrerupe Platforma, in totalitate sau partial,
                  in orice moment, cu sau fara notificare prealabila. Nu garantam functionarea neintrerupta sau
                  fara erori a Platformei.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">9. Protectia Datelor</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Prelucrarea datelor personale se efectueaza in conformitate cu Regulamentul General privind
                  Protectia Datelor (GDPR) si legislatia romana in vigoare. Pentru detalii complete, consultati
                  <a href="/confidentialitate" className="text-primary-600 hover:text-primary-700 ml-1">Politica de Confidentialitate</a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">10. Legea Aplicabila</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Acesti Termeni si Conditii sunt guvernati de legislatia din Romania. Orice disputa va fi
                  solutionata de instantele competente din Romania.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">11. Contact</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Pentru intrebari sau clarificari privind acesti Termeni si Conditii, ne puteti contacta la:
                </p>
                <ul className="list-none mt-4 space-y-2 text-foreground/80 font-body">
                  <li><strong>Email:</strong> contact@catalogsmart.ro</li>
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
