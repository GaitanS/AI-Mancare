import { Metadata } from 'next';
import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';
import { generateOrganizationSchema, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Despre Noi | CatalogSmart',
    description: 'Află povestea CatalogSmart - platforma care te ajută să economisești bani la cumpărături prin compararea prețurilor din toate supermarketurile din România.',
    alternates: {
        canonical: '/despre-noi',
    },
    openGraph: {
        title: 'Despre CatalogSmart',
        description: 'Platforma care te ajută să economisești bani la cumpărături.',
        type: 'website',
    },
};

interface SiteConfig {
    despreNoi: {
        title: string;
        subtitle: string;
        description: string;
        mission: string;
        vision: string;
        features: Array<{ title: string; description: string }>;
        team: Array<{ name: string; role: string; description: string }>;
        stats: { magazines: string; products: string; recipes: string };
        lastUpdated: string;
    };
}

async function getSiteConfig(): Promise<SiteConfig | null> {
    try {
        const configPath = path.join(process.cwd(), 'data', 'site-config.json');
        const data = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export default async function DespreNoiPage() {
    const config = await getSiteConfig();
    const data = config?.despreNoi;

    // Fallback data
    const title = data?.title || 'Despre CatalogSmart';
    const subtitle = data?.subtitle || 'Povestea noastră';
    const description = data?.description || 'CatalogSmart te ajută să economisești bani la cumpărături.';
    const mission = data?.mission || 'Să ajutăm familiile să economisească la cumpărături.';
    const vision = data?.vision || 'Să devenim aplicația preferată pentru compararea prețurilor.';
    const features = data?.features || [];
    const stats = data?.stats || { magazines: '6+', products: '10,000+', recipes: '100+' };

    // Structured data
    const orgSchema = generateOrganizationSchema();
    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Acasă', url: 'https://catalogsmart.ro' },
        { name: 'Despre Noi', url: 'https://catalogsmart.ro/despre-noi' },
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            <div className="min-h-screen bg-white">
                {/* Hero */}
                <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-20">
                    <div className="container-custom">
                        <div className="max-w-3xl mx-auto text-center">
                            {/* Breadcrumb */}
                            <nav className="mb-6 text-sm">
                                <ol className="flex items-center justify-center gap-2 text-neutral-400">
                                    <li><Link href="/" className="hover:text-white">Acasă</Link></li>
                                    <li>/</li>
                                    <li className="text-neutral-300">Despre Noi</li>
                                </ol>
                            </nav>

                            <p className="text-primary-400 font-semibold mb-2">{subtitle}</p>
                            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">{title}</h1>
                            <p className="text-lg text-neutral-300">{description}</p>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-12 bg-primary-50">
                    <div className="container-custom">
                        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
                            <div>
                                <p className="text-3xl font-bold text-primary-600">{stats.magazines}</p>
                                <p className="text-neutral-600">Magazine</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-primary-600">{stats.products}</p>
                                <p className="text-neutral-600">Produse</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-primary-600">{stats.recipes}</p>
                                <p className="text-neutral-600">Rețete</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="py-16">
                    <div className="container-custom">
                        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                            <div className="bg-neutral-50 p-8 rounded-2xl">
                                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Misiunea noastră</h2>
                                <p className="text-neutral-600 leading-relaxed">{mission}</p>
                            </div>
                            <div className="bg-neutral-50 p-8 rounded-2xl">
                                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Viziunea noastră</h2>
                                <p className="text-neutral-600 leading-relaxed">{vision}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                {features.length > 0 && (
                    <section className="py-16 bg-neutral-50">
                        <div className="container-custom">
                            <h2 className="font-display text-3xl font-bold text-center text-neutral-900 mb-12">
                                Ce oferim
                            </h2>
                            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                {features.map((feature, index) => (
                                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                                        <h3 className="font-display text-xl font-bold text-neutral-900 mb-3">{feature.title}</h3>
                                        <p className="text-neutral-600">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA */}
                <section className="py-16">
                    <div className="container-custom text-center">
                        <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">
                            Începe să economisești acum
                        </h2>
                        <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
                            Descoperă cele mai bune oferte din toate supermarketurile și găsește rețete delicioase la prețuri mici.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/cataloage" className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                                Vezi Ofertele
                            </Link>
                            <Link href="/retete" className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-400 transition-colors">
                                Descoperă Rețete
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
