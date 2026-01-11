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
    default: 'Catalog Kaufland, Lidl, Profi Online - Toate Ofertele Actuale 2026',
    template: '%s | CatalogSmart',
  },
  description:
    'Vezi online cataloagele Kaufland, Lidl si Profi. Oferte si promotii actualizate saptamanal. Retete ieftine cu produse la reducere. Economiseste la cumparaturi!',
  keywords: [
    'catalog kaufland',
    'catalog lidl',
    'catalog profi',
    'catalog kaufland actual',
    'catalog lidl actual',
    'catalog profi online',
    'catalog kaufland nou',
    'catalog lidl saptamana viitoare',
    'oferte kaufland',
    'oferte lidl',
    'oferte profi',
    'promotii kaufland',
    'promotii lidl',
    'rețete ieftine',
    'rețete economice',
    'meniu săptămânal',
    'gătit economic',
    'buget mic',
    'economii cumpărături',
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
    title: 'Catalog Kaufland, Lidl, Profi Online - Toate Ofertele Actuale',
    description:
      'Vezi online cataloagele Kaufland, Lidl si Profi. Oferte si promotii actualizate saptamanal. Retete ieftine cu produse la reducere.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CatalogSmart - Cataloage Online Kaufland, Lidl, Profi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catalog Kaufland, Lidl, Profi Online - Oferte Actuale',
    description:
      'Vezi online cataloagele Kaufland, Lidl si Profi. Oferte actualizate saptamanal. Retete ieftine cu produse la reducere.',
    images: ['/og-image.jpg'],
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
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CatalogSmart',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro',
  description: 'Cataloage online Kaufland, Lidl, Profi cu oferte si reduceri. Retete ieftine cu produse la promotie.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro'}/oferte?search={search_term_string}`,
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
  description: 'Cataloage online Kaufland, Lidl, Profi - Toate ofertele si promotiile actualizate saptamanal',
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

        {/* JSON-LD Structured Data - Safe: using JSON.stringify on controlled objects */}
        <Script
          id="website-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
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
