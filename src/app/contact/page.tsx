import { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact - Trimite-ne un Mesaj',
  description: 'Contactează echipa CatalogSmart. Trimite-ne un mesaj pentru întrebări, sugestii sau probleme tehnice. Răspundem în maximum 48 de ore.',
  keywords: 'contact catalogsmart, suport, ajutor, mesaj, email',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact',
    description: 'Contactează echipa CatalogSmart pentru întrebări, sugestii sau suport tehnic.',
    type: 'website',
  },
};

const subjects = [
  'Intrebare generala',
  'Despre oferte si produse',
  'Despre retete',
  'Problema tehnica',
  'Sugestie sau feedback',
  'Propunere de parteneriat',
  'Cerere GDPR (date personale)',
  'Altele',
];

export default function ContactPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

        <div className="container-custom py-8 sm:py-12 relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 font-heading">
            Contact
          </h1>
          <p className="text-white/80 font-body text-sm sm:text-base">
            Aveti intrebari? Ne-ar face placere sa auzim de la dumneavoastra.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-8 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Contact Info */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 h-full">
                <h2 className="text-xl font-bold text-foreground mb-6 font-heading">Informatii de Contact</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground font-heading">Email</h3>
                      <p className="text-foreground/70 font-body">contact@catalogsmart.ro</p>
                      <p className="text-foreground/70 font-body">privacy@catalogsmart.ro</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground font-heading">Program Raspuns</h3>
                      <p className="text-foreground/70 font-body">Luni - Vineri: 9:00 - 18:00</p>
                      <p className="text-foreground/70 font-body">Raspundem in max. 48 ore</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground font-heading">Informatii Utile</h3>
                      <p className="text-foreground/70 font-body text-sm">
                        Pentru probleme tehnice, va rugam sa includeti detalii despre browser-ul folosit si descrierea problemei.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="font-semibold text-foreground mb-4 font-heading">Linkuri Utile</h3>
                  <div className="space-y-2">
                    <a href="/termeni" className="block text-primary-600 hover:text-primary-700 font-body text-sm">
                      Termeni si Conditii
                    </a>
                    <a href="/confidentialitate" className="block text-primary-600 hover:text-primary-700 font-body text-sm">
                      Politica de Confidentialitate
                    </a>
                    <a href="/cookies" className="block text-primary-600 hover:text-primary-700 font-body text-sm">
                      Politica de Cookies
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 font-heading">Trimite-ne un mesaj</h2>
                <ContactForm subjects={subjects} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
