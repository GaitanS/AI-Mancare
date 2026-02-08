import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cos de Cumparaturi - Lista Inteligenta',
  description:
    'Cosul tau inteligent de cumparaturi. Compara preturile intre magazine si gaseste cele mai bune oferte pentru lista ta de cumparaturi.',
  alternates: {
    canonical: '/cart',
  },
  openGraph: {
    title: 'Cos de Cumparaturi Inteligent',
    description:
      'Compara preturile si optimizeaza lista de cumparaturi cu CatalogSmart.',
    type: 'website',
    url: '/cart',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
