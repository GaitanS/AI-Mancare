import { Metadata } from 'next';
import CatalogViewer from '@/components/catalog/CatalogViewer';

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
            {/* Catalog Viewer */}
            <section className="py-2 sm:py-3">
                <div className="container-custom px-2 sm:px-4">
                    <CatalogViewer />
                </div>
            </section>
        </div>
    );
}
