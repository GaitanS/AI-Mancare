import { Metadata } from 'next';
import CatalogList from '@/components/catalog/CatalogList';

export const metadata: Metadata = {
    title: 'Cataloage Digitale - Răsfoiește Toate Ofertele | CatalogSmart',
    description: 'Vezi cataloagele complete din Kaufland, Lidl, Penny și alte magazine. Răsfoiește toate paginile ca într-o revistă digitală.',
    alternates: {
        canonical: '/cataloage-digitale',
    },
};

export default function CataloageDigitalePage() {
    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Page Header */}
            <section className="py-8 border-b border-neutral-200 bg-white">
                <div className="container-custom">
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                        Cataloage Digitale
                    </h1>
                    <p className="text-lg text-neutral-600 max-w-3xl">
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
