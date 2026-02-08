import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planificare Meniu Saptamanal - Retete Economice',
  description:
    'Planifica meniul saptamanal cu retete economice bazate pe ofertele din supermarketuri. Genereaza automat lista de cumparaturi si economiseste bani!',
  alternates: {
    canonical: '/plan',
  },
  openGraph: {
    title: 'Planificare Meniu Saptamanal',
    description:
      'Retete economice si plan de mese optimizat pentru bugetul tau. Economiseste pana la 30% la cumparaturi!',
    type: 'website',
    url: '/plan',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
