import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'),
  title: {
    default: 'Retete Ieftine - Oferte si Retete Economice pentru Toata Familia',
    template: '%s | Retete Ieftine',
  },
  description:
    'Descopera cele mai bune oferte din supermarketuri si retete delicioase la preturi mici. Economiseste bani cu Retete Ieftine!',
  keywords: [
    'retete ieftine',
    'oferte supermarket',
    'retete economice',
    'mancare ieftina',
    'catalog oferte',
    'Kaufland',
    'Lidl',
    'Penny',
    'Carrefour',
    'Mega Image',
    'Auchan',
    'retete Romania',
    'buget mic',
    'economii',
  ],
  authors: [{ name: 'Retete Ieftine' }],
  creator: 'Retete Ieftine',
  publisher: 'Retete Ieftine',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: '/',
    siteName: 'Retete Ieftine',
    title: 'Retete Ieftine - Oferte si Retete Economice',
    description:
      'Descopera cele mai bune oferte din supermarketuri si retete delicioase la preturi mici.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Retete Ieftine - Oferte si Retete Economice',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Retete Ieftine - Oferte si Retete Economice',
    description:
      'Descopera cele mai bune oferte din supermarketuri si retete delicioase la preturi mici.',
    images: ['/og-image.jpg'],
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// JSON-LD structured data for the website
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Retete Ieftine',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro',
  description: 'Platformă pentru oferte din supermarketuri si retete economice',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Retete Ieftine',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro',
  logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://reteteieftine.ro'}/logo.png`,
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable}`}>
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
      <body className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
