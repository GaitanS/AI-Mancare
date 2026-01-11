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
  title: `Catalog Lidl Actual ${currentMonth} ${currentYear} - Oferte Săptămâna ${currentWeek}`,
  description: `Catalog Lidl actual valabil ${currentMonth} ${currentYear}. Vezi toate produsele la reducere, oferte speciale Lidl și promoții. Cataloage actualizate săptămânal. Economisește la cumpărături!`,
  keywords: [
    'catalog lidl',
    'catalog lidl actual',
    'catalog lidl nou',
    'catalog lidl saptamana viitoare',
    'catalog lidl online',
    `catalog lidl ${currentMonth.toLowerCase()} ${currentYear}`,
    'catalog lidl saptamana aceasta',
    'catalog lidl pdf',
    'catalog lidl online pdf',
    'oferte lidl',
    'promotii lidl',
    'reduceri lidl',
    'lidl romania catalog online',
    'catalog lidl produse',
  ].join(', '),
  alternates: {
    canonical: '/catalog-lidl',
  },
  openGraph: {
    title: `Catalog Lidl Actual ${currentMonth} ${currentYear} - Toate Ofertele`,
    description: `Catalog Lidl cu oferte și promoții valabile ${currentMonth} ${currentYear}. Reduceri la alimente, electrocasnice, produse pentru casă. Vezi online!`,
    url: '/catalog-lidl',
    type: 'website',
    locale: 'ro_RO',
    siteName: 'CatalogSmart',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Catalog Lidl Actual - ${currentMonth} ${currentYear}`,
    description: 'Vezi cataloagele și reducerile Lidl. Actualizat săptămânal!',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function CatalogLidlPage() {
  // Get current valid products count for Lidl
  const productCount = await prisma.product.count({
    where: {
      store: 'Lidl',
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  });

  // Redirect to offers page filtered by Lidl
  redirect('/oferte?store=Lidl');
}
