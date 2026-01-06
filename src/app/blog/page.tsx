import { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';

export const metadata: Metadata = {
    title: 'Blog - Sfaturi pentru Cumpărături Inteligente | CatalogSmart',
    description: 'Descoperă ghiduri, tips și trucuri pentru a economisi bani la cumpărături. Articole despre oferte, rețete ieftine și planificare buget.',
    openGraph: {
        title: 'Blog CatalogSmart - Economisește la Cumpărături',
        description: 'Ghiduri complete pentru cumpărături inteligente în România.',
    },
};

// Static articles (will be replaced with database after migration)
const staticArticles = [
    // NEW PRIORITY SEO ARTICLES
    {
        id: '7',
        title: 'Catalog Kaufland această săptămână - Cele mai bune oferte 2026',
        slug: 'catalog-kaufland-aceasta-saptamana-oferte-2026',
        excerpt: 'Vezi toate ofertele din catalogul Kaufland valabil săptămâna aceasta. Prețuri actualizate și comparații cu alte magazine.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-07'),
        readingTime: 6,
        author: 'CatalogSmart',
    },
    {
        id: '8',
        title: 'Catalog Lidl săptămânal - Oferte și promoții România 2026',
        slug: 'catalog-lidl-oferte-saptamanale-romania-2026',
        excerpt: 'Descoperă cele mai noi oferte din catalogul Lidl. Produse alimentare, non-alimentare și bazarul de la mijlocul săptămânii.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-07'),
        readingTime: 7,
        author: 'CatalogSmart',
    },
    {
        id: '9',
        title: 'Oferte Penny - Promoții săptămânale și prețuri mici 2026',
        slug: 'oferte-penny-promotii-saptamanale-2026',
        excerpt: 'Cele mai bune oferte din cataloagele Penny. Reduceri la produse alimentare și non-alimentare disponibile în magazine.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-06'),
        readingTime: 5,
        author: 'CatalogSmart',
    },
    {
        id: '10',
        title: 'Cataloage supermarketuri România - Toate ofertele într-un singur loc',
        slug: 'cataloage-supermarketuri-romania-toate-ofertele',
        excerpt: 'Vezi toate cataloagele de la Lidl, Kaufland, Penny, Carrefour, Mega Image și Auchan. Compară prețuri și găsește cele mai bune oferte.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-05'),
        readingTime: 8,
        author: 'CatalogSmart',
    },
    // ORIGINAL ARTICLES
    {
        id: '1',
        title: 'Cum să economisești la cumpărături - Ghid complet 2026',
        slug: 'cum-sa-economisesti-la-cumparaturi-ghid-complet-2026',
        excerpt: 'Descoperă cele mai eficiente strategii pentru a reduce costurile la cumpărături fără a compromite calitatea. De la planificarea listei până la folosirea aplicațiilor de comparare prețuri.',
        category: 'economie',
        coverImage: null,
        publishedAt: new Date('2026-01-06'),
        readingTime: 8,
        author: 'CatalogSmart',
    },
    {
        id: '11',
        title: 'Prețuri alimente România 2026 - Evoluție și cum să economisești',
        slug: 'preturi-alimente-romania-2026-evolutie-inflatie',
        excerpt: 'Cum au evoluat prețurile alimentelor în 2026? Analiză completă și strategii pentru a face față scumpirilor.',
        category: 'economie',
        coverImage: null,
        publishedAt: new Date('2026-01-04'),
        readingTime: 10,
        author: 'CatalogSmart',
    },
    {
        id: '2',
        title: 'Top 5 supermarketuri din România - Comparație prețuri 2026',
        slug: 'top-5-supermarketuri-romania-comparatie-preturi',
        excerpt: 'Analizăm în detaliu prețurile la Lidl, Kaufland, Penny, Carrefour și Mega Image. Află care magazin oferă cele mai bune prețuri pentru diferite categorii de produse.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-05'),
        readingTime: 10,
        author: 'CatalogSmart',
    },
    {
        id: '12',
        title: 'Comparație prețuri Lidl vs Kaufland vs Penny vs Carrefour 2026',
        slug: 'comparatie-preturi-lidl-kaufland-penny-carrefour-2026',
        excerpt: 'Analiză detaliată a prețurilor la principalele supermarketuri din România. Descoperă unde găsești cele mai bune oferte.',
        category: 'economie',
        coverImage: null,
        publishedAt: new Date('2026-01-01'),
        readingTime: 9,
        author: 'CatalogSmart',
    },
    {
        id: '3',
        title: 'Rețete pentru studenți - Mese complete sub 20 lei',
        slug: 'retete-studenti-mese-sub-20-lei',
        excerpt: 'Nu ai bani mulți dar vrei să mănânci sănătos? Iată 10 rețete delicioase și nutritive pe care le poți prepara cu ingrediente ieftine din orice supermarket.',
        category: 'retete',
        coverImage: null,
        publishedAt: new Date('2026-01-04'),
        readingTime: 6,
        author: 'CatalogSmart',
    },
    {
        id: '13',
        title: 'Rețete economice pentru întreaga familie - Mese sub 50 lei 2026',
        slug: 'retete-economice-pentru-intreaga-familie-2026',
        excerpt: 'Rețete gustoase și hrănitoare pentru 4 persoane cu buget redus. Mese complete sub 50 de lei cu ingrediente ieftine.',
        category: 'retete',
        coverImage: null,
        publishedAt: new Date('2026-01-03'),
        readingTime: 8,
        author: 'CatalogSmart',
    },
    {
        id: '4',
        title: 'Când apar cele mai bune oferte la Lidl, Kaufland și Penny',
        slug: 'cand-apar-cele-mai-bune-oferte-lidl-kaufland-penny',
        excerpt: 'Fiecare supermarket are un calendar specific pentru reduceri. Află exact în ce zile să mergi la cumpărături pentru a prinde cele mai mari discounturi.',
        category: 'tips',
        coverImage: null,
        publishedAt: new Date('2026-01-03'),
        readingTime: 5,
        author: 'CatalogSmart',
    },
    {
        id: '14',
        title: 'Reduceri de weekend la supermarketuri - Cum să prinzi cele mai bune oferte',
        slug: 'reduceri-de-weekend-supermarketuri-cum-sa-prinzi-ofertele',
        excerpt: 'Strategii pentru a profita maxim de reducerile de weekend. Produse aproape de expirare, lichidări și oferte flash.',
        category: 'tips',
        coverImage: null,
        publishedAt: new Date('2025-12-28'),
        readingTime: 6,
        author: 'CatalogSmart',
    },
    {
        id: '5',
        title: 'Cum să citești corect cataloagele de reduceri',
        slug: 'cum-sa-citesti-corect-cataloagele-de-reduceri',
        excerpt: 'Nu te lăsa păcălit de ofertele aparent bune! Învață să identifici reducerile reale și să eviți capcanele de marketing din cataloage.',
        category: 'tips',
        coverImage: null,
        publishedAt: new Date('2026-01-02'),
        readingTime: 7,
        author: 'CatalogSmart',
    },
    {
        id: '15',
        title: 'Meal Prep săptămânal - Ghid complet pentru începători 2026',
        slug: 'meal-prep-saptamanal-ghid-incepatori-2026',
        excerpt: 'Învață să pregătești mesele pentru întreaga săptămână. Economisești timp, bani și mănânci mai sănătos.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-02'),
        readingTime: 12,
        author: 'CatalogSmart',
    },
    {
        id: '6',
        title: 'Lista de cumpărături perfectă pentru o familie de 4 persoane',
        slug: 'lista-cumparaturi-perfecta-familie-4-persoane',
        excerpt: 'Planifică eficient cumpărăturile săptămânale pentru familia ta. Include template descărcabil și estimări de costuri pentru fiecare categorie.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2026-01-01'),
        readingTime: 9,
        author: 'CatalogSmart',
    },
    {
        id: '16',
        title: 'Cumpărături online supermarket România - Ghid livrare la domiciliu 2026',
        slug: 'cumparaturi-online-supermarket-romania-livrare-acasa',
        excerpt: 'Compară serviciile de livrare de la Carrefour, Mega Image, Auchan și supermarketurile online. Costuri, timp și experiență.',
        category: 'ghiduri',
        coverImage: null,
        publishedAt: new Date('2025-12-30'),
        readingTime: 7,
        author: 'CatalogSmart',
    },
];

const categories = [
    { id: 'all', label: 'Toate' },
    { id: 'tips', label: 'Tips & Trucuri' },
    { id: 'economie', label: 'Economie' },
    { id: 'retete', label: 'Rețete' },
    { id: 'ghiduri', label: 'Ghiduri' },
];

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
            {/* Hero Section */}
            <section className="relative py-16 md:py-24 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white overflow-hidden">
                <div className="absolute inset-0 pattern-kitchen opacity-5" />
                <div className="container-custom relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            Blog CatalogSmart
                        </h1>
                        <p className="text-lg text-neutral-300 mb-8">
                            Sfaturi, ghiduri și trucuri pentru cumpărături inteligente.
                            Economisește bani și timp cu articolele noastre.
                        </p>

                        {/* Category Pills */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${cat.id === 'all'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Articles Grid */}
            <section className="py-12 md:py-16">
                <div className="container-custom">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {staticArticles.map((article) => (
                            <ArticleCard
                                key={article.id}
                                title={article.title}
                                slug={article.slug}
                                excerpt={article.excerpt}
                                category={article.category}
                                coverImage={article.coverImage}
                                publishedAt={article.publishedAt}
                                readingTime={article.readingTime}
                                author={article.author}
                            />
                        ))}
                    </div>

                    {/* Load More (placeholder) */}
                    <div className="text-center mt-12">
                        <p className="text-neutral-500">
                            Mai multe articole în curând...
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-primary-50">
                <div className="container-custom text-center">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
                        Vrei să economisești și mai mult?
                    </h2>
                    <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
                        Folosește CatalogSmart pentru a compara prețurile din toate supermarketurile și găsește cele mai bune oferte automat.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/cataloage"
                            className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                        >
                            Vezi Ofertele
                        </Link>
                        <Link
                            href="/retete"
                            className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-400 transition-colors"
                        >
                            Descoperă Rețete
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
