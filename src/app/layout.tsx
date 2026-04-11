import type { Metadata, Viewport } from 'next';
import { Fraunces, DM_Sans, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
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
    default: 'Cataloage Kaufland, Lidl, Penny, Carrefour, Mega Image - Oferte Actuale 2026',
    template: '%s | CatalogSmart',
  },
  description:
    'Cataloage si oferte actuale din Kaufland, Lidl, Penny, Carrefour, Mega Image, Auchan si Profi. Promotii actualizate zilnic. Compara preturi si economiseste la cumparaturi!',
  keywords: [
    'catalog kaufland',
    'catalog lidl',
    'catalog penny',
    'catalog carrefour',
    'catalog mega image',
    'catalog auchan',
    'catalog kaufland actual',
    'catalog lidl actual',
    'catalog penny actual',
    'catalog carrefour actual',
    'catalog mega image actual',
    'catalog auchan actual',
    'oferte kaufland',
    'oferte lidl',
    'oferte penny',
    'oferte carrefour',
    'oferte mega image',
    'oferte auchan',
    'cel mai ieftin supermarket',
    'cel mai ieftin supermarket din romania',
    'cel mai ieftin supermarket 2026',
    'comparatie preturi supermarketuri',
    'top supermarketuri romania',
    'cataloage supermarketuri romania',
    'pliant lidl actual',
    'revista lidl actuala',
    'oferte carrefour azi',
    'catalog penny saptamana aceasta',
    'rețete ieftine',
    'rețete economice',
    'cumparaturi ieftine',
    'toate ofertele supermarketurilor',
    'compara preturi supermarketuri bucuresti',
  ],
  authors: [{ name: 'CatalogSmart' }],
  creator: 'CatalogSmart',
  publisher: 'CatalogSmart',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: '/',
    siteName: 'CatalogSmart',
    title: 'Cataloage Kaufland, Lidl, Penny, Carrefour, Mega Image - Oferte Actuale',
    description:
      'Cataloage si oferte actuale din Kaufland, Lidl, Penny, Carrefour, Mega Image, Auchan. Compara preturi si economiseste la cumparaturi!',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'CatalogSmart - Cataloage Online Supermarketuri Romania',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cataloage Kaufland, Lidl, Penny, Carrefour - Oferte Actuale',
    description:
      'Cataloage si oferte actuale din toate supermarketurile. Compara preturi, gaseste reduceri si economiseste la cumparaturi!',
    images: ['/opengraph-image'],
    creator: '@catalogsmart',
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
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CatalogSmart',
  url: SITE_URL,
  description: 'Cataloage online Kaufland, Lidl, Penny, Carrefour, Mega Image, Auchan cu oferte si reduceri. Compara preturi supermarketuri Romania.',
  inLanguage: 'ro',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CatalogSmart',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/icon.png`,
    width: 512,
    height: 512,
  },
  description: 'Cataloage online Kaufland, Lidl, Penny, Carrefour, Mega Image, Auchan - Oferte si promotii actualizate zilnic',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'contact@catalogsmart.ro',
    availableLanguage: 'Romanian',
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${fraunces.variable} ${dmSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ scrollBehavior: 'smooth' }}
    >
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Google AdSense - Verification Meta Tag */}
        <meta name="google-adsense-account" content="ca-pub-4509784482094331" />
      </head>
      <body className="min-h-screen flex flex-col bg-background font-body text-foreground">
        {/* Google AdSense - Auto Ads */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4509784482094331"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* JSON-LD Structured Data - Safe: using JSON.stringify on controlled static objects, rendered inline for immediate crawler access */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />

        <GoogleAnalytics />
        <Header />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
