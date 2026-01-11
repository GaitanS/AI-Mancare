import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Despre Noi - Echipa CatalogSmart | Povestea Noastră',
    description: 'Află povestea CatalogSmart - platforma care te ajută să economisești la cumpărături. Suntem o echipă pasionată de tehnologie și gătit economic.',
    keywords: 'despre catalogsmart, echipa, cine suntem, misiune, poveste',
    openGraph: {
        title: 'Despre Noi - Echipa CatalogSmart',
        description: 'Află povestea CatalogSmart - platforma care te ajută să economisești la cumpărături.',
        type: 'website'
    }
}

export default function DesprePage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Hero Section */}
            <section className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 text-stone-800">
                    Despre CatalogSmart
                </h1>
                <p className="text-xl text-stone-600">
                    Ajutăm familiile din România să economisească la cumpărături
                </p>
            </section>

            {/* Mission */}
            <section className="mb-12 bg-amber-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-4 text-stone-800">🎯 Misiunea Noastră</h2>
                <p className="text-lg text-stone-700 leading-relaxed">
                    CatalogSmart a fost creat cu o misiune simplă: să facem cumpărăturile mai inteligente pentru toți românii.
                    Într-o eră a inflației și a prețurilor în creștere, credem că fiecare familie merită acces gratuit
                    la informații despre cele mai bune oferte și rețete economice.
                </p>
            </section>

            {/* What We Do */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-stone-800">💡 Ce Facem</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-semibold mb-3 text-amber-700">📊 Comparăm Prețurile</h3>
                        <p className="text-stone-600">
                            Scanăm zilnic cataloagele din Kaufland, Lidl, Carrefour, Mega Image, Penny și alte magazine
                            pentru a-ți arăta unde găsești cele mai bune prețuri.
                        </p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-semibold mb-3 text-amber-700">🍳 Sugerăm Rețete</h3>
                        <p className="text-stone-600">
                            Algoritmul nostru analizează ofertele săptămânii și îți sugerează rețete care folosesc
                            ingredientele la reducere - așa gătești gustos și economic.
                        </p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-semibold mb-3 text-amber-700">📋 Planificăm Meniul</h3>
                        <p className="text-stone-600">
                            Creăm automat meniuri săptămânale personalizate, bazate pe bugetul tău, preferințele
                            alimentare și numărul de persoane din familie.
                        </p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-semibold mb-3 text-amber-700">🛒 Generăm Liste</h3>
                        <p className="text-stone-600">
                            Exportezi lista de cumpărături optimizată - știi exact ce să cumperi și de unde,
                            pentru a economisi maximum.
                        </p>
                    </div>
                </div>
            </section>

            {/* E-E-A-T Trust Signals */}
            <section className="mb-12 bg-green-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-stone-800">✓ De Ce Ne Poți Avea Încredere</h2>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                            <strong>Prețuri actualizate zilnic</strong>
                            <p className="text-stone-600">Scanăm cataloagele oficiale ale magazinelor în fiecare zi.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                            <strong>Rețete testate</strong>
                            <p className="text-stone-600">Fiecare rețetă este verificată de echipa noastră înainte de publicare.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                            <strong>100% Gratuit</strong>
                            <p className="text-stone-600">Nu avem costuri ascunse. Platforma este și va rămâne gratuită.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                            <strong>Datele tale sunt protejate</strong>
                            <p className="text-stone-600">Respectăm GDPR și nu vindem datele utilizatorilor.</p>
                        </div>
                    </li>
                </ul>
            </section>

            {/* Stats */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-stone-800 text-center">📈 CatalogSmart în Cifre</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-amber-100 rounded-xl p-6">
                        <div className="text-3xl font-bold text-amber-800">10,000+</div>
                        <div className="text-stone-600">Utilizatori</div>
                    </div>
                    <div className="bg-amber-100 rounded-xl p-6">
                        <div className="text-3xl font-bold text-amber-800">500+</div>
                        <div className="text-stone-600">Rețete</div>
                    </div>
                    <div className="bg-amber-100 rounded-xl p-6">
                        <div className="text-3xl font-bold text-amber-800">7</div>
                        <div className="text-stone-600">Magazine</div>
                    </div>
                    <div className="bg-amber-100 rounded-xl p-6">
                        <div className="text-3xl font-bold text-amber-800">200 lei</div>
                        <div className="text-stone-600">Economie/lună</div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Gata să Economisești?</h2>
                <p className="mb-6 opacity-90">
                    Alătură-te celor 10,000+ de familii care economisesc cu CatalogSmart
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/oferte"
                        className="bg-white text-amber-600 px-6 py-3 rounded-full font-semibold hover:bg-amber-50 transition"
                    >
                        Vezi Ofertele →
                    </Link>
                    <Link
                        href="/plan"
                        className="border-2 border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition"
                    >
                        Explorează Rețete
                    </Link>
                </div>
            </section>

            {/* Schema.org */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'AboutPage',
                        mainEntity: {
                            '@type': 'Organization',
                            name: 'CatalogSmart',
                            url: 'https://catalogsmart.ro',
                            description: 'Platforma care te ajută să economisești la cumpărături în România',
                            foundingDate: '2024',
                            areaServed: 'Romania',
                            sameAs: [
                                'https://facebook.com/catalogsmart',
                                'https://instagram.com/catalogsmart'
                            ]
                        }
                    })
                }}
            />
        </div>
    )
}
