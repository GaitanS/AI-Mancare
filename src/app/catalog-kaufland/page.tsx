import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';

// Dynamic date for SEO
const now = new Date();
const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const currentMonth = monthNames[now.getMonth()];
const currentYear = now.getFullYear();

// Get current week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const currentWeek = getWeekNumber(now);

export const metadata: Metadata = {
  title: `Catalog Kaufland Actual ${currentMonth} ${currentYear} - Oferte Săptămâna ${currentWeek}`,
  description: `Catalog Kaufland actual valabil ${currentMonth} ${currentYear}. Vezi toate produsele la reducere, oferte speciale și promoții Kaufland. Cataloage actualizate săptămânal. Economisește la cumpărături!`,
  keywords: [
    'catalog kaufland',
    'catalog kaufland actual',
    'catalog kaufland nou',
    'catalog kaufland azi',
    'catalog kaufland online',
    `catalog kaufland ${currentMonth.toLowerCase()} ${currentYear}`,
    'catalog kaufland saptamana aceasta',
    'catalog kaufland saptamana viitoare',
    'oferte kaufland',
    'promotii kaufland',
    'reduceri kaufland',
    'catalog kaufland produse',
    'catalog kaufland pdf',
    'kaufland catalog online',
  ].join(', '),
  alternates: {
    canonical: '/catalog-kaufland',
  },
  openGraph: {
    title: `Catalog Kaufland Actual ${currentMonth} ${currentYear} - Toate Ofertele`,
    description: `Catalog Kaufland cu oferte și promoții valabile ${currentMonth} ${currentYear}. Reduceri la alimente, electrocasnice, produse pentru casă. Vezi online!`,
    url: '/catalog-kaufland',
    type: 'website',
    locale: 'ro_RO',
    siteName: 'CatalogSmart',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Catalog Kaufland Actual - ${currentMonth} ${currentYear}`,
    description: 'Vezi cataloagele și reducerile Kaufland. Actualizat săptămânal!',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function CatalogKauflandPage() {
  // Get current valid products count for Kaufland
  const productCount = await prisma.product.count({
    where: {
      store: 'Kaufland',
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  });

  // Redirect to offers page filtered by Kaufland
  redirect('/oferte?store=Kaufland');
}
