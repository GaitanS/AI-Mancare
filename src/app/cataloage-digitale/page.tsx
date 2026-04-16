import { Metadata } from 'next';
import CatalogList from '@/components/catalog/CatalogList';

export const metadata: Metadata = {
    title: 'Cataloage Digitale Kaufland, Lidl, Penny, Carrefour, Mega Image',
    description: 'Rasfoieste cataloagele complete din Kaufland, Lidl, Penny, Carrefour, Mega Image si Auchan. Toate paginile ca intr-o revista digitala, actualizate saptamanal.',
    alternates: {
        canonical: '/cataloage-digitale',
    },
    openGraph: {
        title: 'Cataloage Digitale Kaufland, Lidl, Penny, Carrefour, Mega Image',
        description: 'Cataloage complete din Kaufland, Lidl, Penny, Carrefour, Mega Image si Auchan. Rasfoieste online, actualizate saptamanal.',
        type: 'website',
        url: '/cataloage-digitale',
    },
};

export default function CataloageDigitalePage() {
    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Page Header - Compact on Mobile */}
            <section className="py-4 md:py-8 border-b border-neutral-200 bg-white">
                <div className="container-custom">
                    <h1 className="text-xl md:text-4xl font-bold text-neutral-900 mb-1 md:mb-3">
                        Cataloage Digitale
                    </h1>
                    <p className="text-sm md:text-lg text-neutral-600 max-w-3xl">
                        Răsfoiește cataloagele de oferte actuale de la toate magazinele tale preferate.
                    </p>
                </div>
            </section>

            {/* Catalog List */}
            <section className="py-8">
                <div className="container-custom">
                    <CatalogList />
                </div>
            </section>
        </div>
    );
}
