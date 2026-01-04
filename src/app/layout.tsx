import type { Metadata, Viewport } from 'next';
import { Fraunces, DM_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import GoogleAnalytics from '@/components/GoogleAnalytics';

// Display font - Serif for headlines (optimized: 2 weights for ~60% smaller font bundle)
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  preload: true,
});

// Body font - Modern sans-serif (optimized: 2 weights for ~50% smaller font bundle)
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  preload: true,
});

// Mono font (optimized: single weight)
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro'),
  title: {
    default: 'CatalogSmart - Oferte și Rețete Economice | 2026',
    template: '%s | CatalogSmart',
  },
  description:
    'Descoperă rețete economice bazate pe reducerile din Kaufland, Lidl, Carrefour. Economisești 30% la cumpărături. Gratis!',
  keywords: [
    'rețete ieftine',
    'mâncare ieftină',
    'rețete economice',
    'meniu săptămânal',
    'gătit economic',
    'oferte supermarket',
    'rețete simple',
    'meal planning',
    'Kaufland',
    'Lidl',
    'Carrefour',
    'Mega Image',
    'Penny',
    'buget mic',
    'economii mâncare',
    'bucătărie românească',
  ],
  authors: [{ name: 'Rețete Ieftine' }],
  creator: 'Rețete Ieftine',
  publisher: 'Rețete Ieftine',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: '/',
    siteName: 'Rețete Ieftine',
    title: 'Rețete Ieftine - Gătește gustos cu buget mic',
    description:
      'Descoperă rețete economice bazate pe reducerile săptămânale. Economisești 30% la cumpărături!',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Rețete Ieftine - Gătește gustos cu buget mic',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rețete Ieftine - Gătește gustos cu buget mic',
    description:
      'Descoperă rețete economice bazate pe reducerile săptămânale. Economisești 30% la cumpărături!',
    images: ['/og-image.jpg'],
    creator: '@reteteieftine',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

// JSON-LD structured data for the website
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CatalogSmart',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro',
  description: 'Platformă pentru oferte din supermarketuri si retete economice',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro'}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CatalogSmart',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro',
  logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro'}/logo.png`,
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${fraunces.variable} ${dmSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background font-body text-foreground">
        <GoogleAnalytics />
        <Header />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
