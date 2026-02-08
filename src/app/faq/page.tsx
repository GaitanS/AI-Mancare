import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Intrebari Frecvente (FAQ) - Ajutor si Suport',
    description: 'Raspunsuri la cele mai frecvente intrebari despre CatalogSmart. Afla cum sa folosesti platforma, cum economisesti si cum functioneaza compararea preturilor.',
    keywords: 'faq catalogsmart, intrebari frecvente, ajutor, suport, cum functioneaza',
    alternates: {
        canonical: '/faq',
    },
    openGraph: {
        title: 'FAQ - Intrebari Frecvente',
        description: 'Gaseste raspunsuri la cele mai frecvente intrebari despre CatalogSmart.',
        type: 'website',
        url: '/faq',
    }
}

const faqs = [
    {
        category: 'Despre CatalogSmart',
        questions: [
            {
                q: 'Ce este CatalogSmart?',
                a: 'CatalogSmart este o platformă gratuită care te ajută să economisești la cumpărături. Comparăm prețurile din principalele supermarketuri din România (Kaufland, Lidl, Carrefour, Mega Image, Penny) și îți sugerăm rețete economice bazate pe ofertele săptămânii.'
            },
            {
                q: 'Este CatalogSmart gratuit?',
                a: 'Da! CatalogSmart este 100% gratuit și va rămâne așa. Nu avem costuri ascunse, abonamente sau funcții premium plătite.'
            },
            {
                q: 'Cum fac bani dacă e gratuit?',
                a: 'CatalogSmart este susținut prin parteneriate cu magazinele și prin afișarea ofertelor lor. Nu vindem datele utilizatorilor și nu afișăm reclame intruzive.'
            }
        ]
    },
    {
        category: 'Cum Funcționează',
        questions: [
            {
                q: 'De unde luați prețurile?',
                a: 'Prețurile sunt extrase zilnic din cataloagele oficiale ale magazinelor. Folosim tehnologie AI pentru a scana și actualiza informațiile automat.'
            },
            {
                q: 'Cât de actualizate sunt prețurile?',
                a: 'Prețurile sunt actualizate zilnic. Cataloagele noi sunt adăugate în maximum 24 de ore de la publicarea lor de către magazine.'
            },
            {
                q: 'Cum funcționează sugestiile de rețete?',
                a: 'Algoritmul nostru analizează ofertele săptămânii și caută rețete care folosesc ingredientele la reducere. Astfel, gătești gustos și economisești în același timp.'
            },
            {
                q: 'Pot să filtrez rețetele după dietă?',
                a: 'Da! Poți filtra rețetele după: vegetarian, vegan, fără gluten, fără lactoză, low carb, și multe altele. Setează preferințele în profilul tău pentru sugestii personalizate.'
            }
        ]
    },
    {
        category: 'Planificare și Economii',
        questions: [
            {
                q: 'Cât pot economisi cu CatalogSmart?',
                a: 'În medie, utilizatorii noștri economisesc între 150-250 lei pe lună. Depinde de dimensiunea familiei și de cât de mult folosești funcțiile de comparare și planificare.'
            },
            {
                q: 'Cum funcționează planificarea meniului?',
                a: 'Îți setezi bugetul, numărul de persoane și preferințele alimentare. CatalogSmart generează automat un meniu săptămânal optimizat cu ofertele disponibile, plus lista de cumpărături.'
            },
            {
                q: 'Pot modifica meniul generat?',
                a: 'Absolut! Meniul generat este doar o sugestie. Poți înlocui orice rețetă, ajusta porțiile sau adăuga propriile tale preparate.'
            }
        ]
    },
    {
        category: 'Cont și Date',
        questions: [
            {
                q: 'Trebuie să îmi fac cont?',
                a: 'Nu este obligatoriu. Poți folosi CatalogSmart fără cont pentru a vedea oferte și rețete. Contul îți permite să salvezi preferințele, liste și istoricul.'
            },
            {
                q: 'Cum sunt protejate datele mele?',
                a: 'Respectăm GDPR și toate reglementările europene. Datele tale sunt criptate și nu sunt vândute terților. Poți șterge oricând contul și toate informațiile asociate.'
            },
            {
                q: 'Pot folosi CatalogSmart pe telefon?',
                a: 'Da! CatalogSmart este optimizat pentru mobil. Poți accesa platforma din orice browser sau adăuga site-ul pe ecranul principal ca aplicație (PWA).'
            }
        ]
    },
    {
        category: 'Magazine și Oferte',
        questions: [
            {
                q: 'Ce magazine sunt incluse?',
                a: 'Momentan acoperim: Kaufland, Lidl, Carrefour, Mega Image, Penny, Profi și Auchan. Lucrăm să adăugăm și alte magazine.'
            },
            {
                q: 'Pot sugera un magazin nou?',
                a: 'Da! Trimite-ne un email la contact@catalogsmart.ro cu sugestia ta și vom încerca să îl adăugăm.'
            },
            {
                q: 'De ce un produs nu apare în comparație?',
                a: 'Nu toate produsele sunt în toate magazinele sau în ofertă în același timp. Algoritmul caută echivalente similare când produsul exact nu este disponibil.'
            }
        ]
    }
]

export default function FAQPage() {
    return (
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
            {/* Hero - Compact on Mobile */}
            <section className="text-center mb-6 md:mb-12">
                <h1 className="text-xl md:text-4xl font-bold mb-2 md:mb-4 text-stone-800">
                    Întrebări Frecvente
                </h1>
                <p className="text-sm md:text-xl text-stone-600">
                    Găsește răspunsuri rapide la cele mai comune întrebări
                </p>
            </section>

            {/* Quick Links */}
            <section className="mb-8 flex flex-wrap gap-2 justify-center">
                {faqs.map((section) => (
                    <a
                        key={section.category}
                        href={`#${section.category.toLowerCase().replace(/\s+/g, '-')}`}
                        className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200 transition"
                    >
                        {section.category}
                    </a>
                ))}
            </section>

            {/* FAQ Sections */}
            {faqs.map((section) => (
                <section
                    key={section.category}
                    id={section.category.toLowerCase().replace(/\s+/g, '-')}
                    className="mb-10"
                >
                    <h2 className="text-2xl font-bold mb-6 text-stone-800 border-b pb-2">
                        {section.category}
                    </h2>
                    <div className="space-y-4">
                        {section.questions.map((item, idx) => (
                            <details
                                key={idx}
                                className="bg-white border border-stone-200 rounded-xl overflow-hidden group"
                            >
                                <summary className="px-6 py-4 cursor-pointer font-semibold text-stone-800 hover:bg-stone-50 list-none flex justify-between items-center">
                                    <span>{item.q}</span>
                                    <span className="text-amber-600 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="px-6 py-4 bg-stone-50 text-stone-700 border-t">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>
            ))}

            {/* Still Have Questions */}
            <section className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Nu ai găsit ce căutai?</h2>
                <p className="mb-6 opacity-90">
                    Echipa noastră e aici să te ajute
                </p>
                <Link
                    href="/contact"
                    className="bg-white text-amber-600 px-6 py-3 rounded-full font-semibold hover:bg-amber-50 transition inline-block"
                >
                    Contactează-ne →
                </Link>
            </section>

            {/* Schema.org FAQ */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.flatMap(section =>
                            section.questions.map(item => ({
                                '@type': 'Question',
                                name: item.q,
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: item.a
                                }
                            }))
                        )
                    })
                }}
            />
        </div>
    )
}
