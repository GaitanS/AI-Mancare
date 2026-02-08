import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Confidentialitate',
  description: 'Politica de confidentialitate a platformei CatalogSmart. Aflati cum colectam, utilizam si protejam datele dumneavoastra personale.',
  alternates: {
    canonical: '/confidentialitate',
  },
  openGraph: {
    title: 'Politica de Confidentialitate',
    description: 'Cum colectam, utilizam si protejam datele personale pe CatalogSmart.',
    type: 'website',
    url: '/confidentialitate',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ConfidentialitatePage() {
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
            Politica de Confidentialitate
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
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">1. Introducere</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  CatalogSmart (&quot;noi&quot;, &quot;al nostru&quot; sau &quot;Platforma&quot;) respecta confidentialitatea utilizatorilor sai.
                  Aceasta Politica de Confidentialitate explica modul in care colectam, utilizam, stocam si protejam
                  datele dumneavoastra personale atunci cand utilizati platforma noastra.
                </p>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Prelucram datele personale in conformitate cu Regulamentul General privind Protectia Datelor (GDPR - UE 2016/679)
                  si legislatia romana in domeniu.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">2. Date Colectate</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Colectam urmatoarele tipuri de date:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">2.1 Date colectate automat</h3>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Date tehnice:</strong> adresa IP, tipul de browser, sistemul de operare, rezolutia ecranului</li>
                  <li><strong>Date de navigare:</strong> paginile vizitate, durata vizitei, actiunile efectuate pe site</li>
                  <li><strong>Cookies:</strong> fisiere mici stocate pe dispozitivul dumneavoastra (vezi sectiunea Cookies)</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">2.2 Date furnizate de utilizatori</h3>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Date de contact:</strong> nume, adresa de email (doar daca ni le furnizati voluntar prin formularul de contact)</li>
                  <li><strong>Preferinte:</strong> magazinele favorite, categoriile preferate de produse</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">3. Scopul Prelucrarii</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Utilizam datele colectate pentru:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Furnizarea si imbunatatirea serviciilor platformei</li>
                  <li>Personalizarea experientei utilizatorului</li>
                  <li>Analiza statistica a traficului si comportamentului utilizatorilor</li>
                  <li>Raspunsul la intrebarile si solicitarile dumneavoastra</li>
                  <li>Asigurarea securitatii si prevenirii fraudelor</li>
                  <li>Respectarea obligatiilor legale</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">4. Temeiul Legal</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Prelucram datele personale pe baza urmatoarelor temeiuri legale:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Consimtamantul:</strong> pentru cookies non-esentiale si comunicari de marketing</li>
                  <li><strong>Interesul legitim:</strong> pentru imbunatatirea serviciilor si analiza statistica</li>
                  <li><strong>Executarea contractului:</strong> pentru furnizarea serviciilor solicitate</li>
                  <li><strong>Obligatia legala:</strong> pentru respectarea cerintelor legale</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">5. Partajarea Datelor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Nu vindem si nu inchiriem datele dumneavoastra personale catre terte parti. Putem partaja date cu:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Furnizori de servicii:</strong> hosting, analiza web (Google Analytics), care actioneaza in numele nostru</li>
                  <li><strong>Autoritati publice:</strong> cand suntem obligati legal</li>
                </ul>
                <p className="text-foreground/80 font-body leading-relaxed mt-4">
                  Toti furnizorii nostri de servicii sunt obligati contractual sa protejeze datele si sa le utilizeze
                  doar in scopurile specificate.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">6. Stocarea si Securitatea Datelor</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  Datele sunt stocate pe servere securizate situate in Uniunea Europeana. Implementam masuri tehnice
                  si organizatorice adecvate pentru a proteja datele impotriva accesului neautorizat, pierderii sau distrugerii:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li>Criptare SSL/TLS pentru transmisia datelor</li>
                  <li>Acces restrictionat la date pe baza de rol</li>
                  <li>Monitorizare continua a securitatii</li>
                  <li>Backup-uri regulate ale datelor</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">7. Perioada de Stocare</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Pastram datele personale doar atat timp cat este necesar pentru scopurile pentru care au fost colectate:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body mt-4">
                  <li>Date de analiza: 26 luni</li>
                  <li>Date de contact: pana la retragerea consimtamantului sau solicitarea stergerii</li>
                  <li>Cookies: conform perioadelor specificate in Politica de Cookies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">8. Drepturile Dumneavoastra</h2>
                <p className="text-foreground/80 font-body leading-relaxed mb-4">
                  In conformitate cu GDPR, aveti urmatoarele drepturi:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80 font-body">
                  <li><strong>Dreptul de acces:</strong> puteti solicita o copie a datelor pe care le detinem despre dumneavoastra</li>
                  <li><strong>Dreptul la rectificare:</strong> puteti solicita corectarea datelor incorecte</li>
                  <li><strong>Dreptul la stergere:</strong> puteti solicita stergerea datelor (&quot;dreptul de a fi uitat&quot;)</li>
                  <li><strong>Dreptul la restrictionare:</strong> puteti limita modul in care utilizam datele</li>
                  <li><strong>Dreptul la portabilitate:</strong> puteti primi datele intr-un format structurat</li>
                  <li><strong>Dreptul de opozitie:</strong> puteti refuza prelucrarea in anumite situatii</li>
                  <li><strong>Dreptul de retragere a consimtamantului:</strong> in orice moment, fara a afecta legalitatea prelucrarii anterioare</li>
                </ul>
                <p className="text-foreground/80 font-body leading-relaxed mt-4">
                  Pentru a va exercita drepturile, contactati-ne la: <strong>privacy@catalogsmart.ro</strong>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">9. Cookies</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Utilizam cookies si tehnologii similare pentru a imbunatati experienta pe site.
                  Pentru informatii detaliate, consultati
                  <a href="/cookies" className="text-primary-600 hover:text-primary-700 ml-1">Politica de Cookies</a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">10. Modificari ale Politicii</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Ne rezervam dreptul de a modifica aceasta Politica de Confidentialitate. Orice modificare semnificativa
                  va fi comunicata prin publicarea noii versiuni pe aceasta pagina, cu actualizarea datei &quot;Ultima actualizare&quot;.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">11. Plangeri</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Daca considerati ca drepturile dumneavoastra au fost incalcate, aveti dreptul de a depune o plangere
                  la Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal (ANSPDCP):
                </p>
                <ul className="list-none mt-4 space-y-2 text-foreground/80 font-body">
                  <li><strong>Website:</strong> www.dataprotection.ro</li>
                  <li><strong>Email:</strong> anspdcp@dataprotection.ro</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 font-heading">12. Contact</h2>
                <p className="text-foreground/80 font-body leading-relaxed">
                  Pentru orice intrebari legate de protectia datelor personale:
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
