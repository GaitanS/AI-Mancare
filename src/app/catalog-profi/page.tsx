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
  title: `Catalog Profi Actual ${currentMonth} ${currentYear} - Profi Loco Oferte Săptămâna ${currentWeek}`,
  description: `Catalog Profi și Profi Loco actual valabil ${currentMonth} ${currentYear}. Vezi toate produsele la reducere, oferte speciale și promoții. Cataloage actualizate săptămânal. Economisește la cumpărături!`,
  keywords: [
    'catalog profi',
    'catalog profi loco',
    'catalog profi online',
    'catalog profi actual',
    `catalog profi ${currentMonth.toLowerCase()} ${currentYear}`,
    'catalog profi saptamana aceasta',
    'catalog profi pdf',
    'catalog profi produse',
    'oferte profi',
    'oferte profi loco',
    'promotii profi',
    'reduceri profi',
    'profi catalog online',
    'profi loco oferte',
  ].join(', '),
  alternates: {
    canonical: '/catalog-profi',
  },
  openGraph: {
    title: `Catalog Profi & Profi Loco Actual ${currentMonth} ${currentYear}`,
    description: `Catalog Profi și Profi Loco cu oferte și promoții valabile ${currentMonth} ${currentYear}. Reduceri la alimente, băuturi, cosmetice. Vezi online!`,
    url: '/catalog-profi',
    type: 'website',
    locale: 'ro_RO',
    siteName: 'CatalogSmart',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Catalog Profi Loco Actual - ${currentMonth} ${currentYear}`,
    description: 'Vezi cataloagele și reducerile Profi și Profi Loco. Actualizat săptămânal!',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function CatalogProfiPage() {
  // Get current valid products count for Profi
  const productCount = await prisma.product.count({
    where: {
      store: 'Profi',
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  });

  // Redirect to offers page filtered by Profi
  redirect('/oferte?store=Profi');
}
