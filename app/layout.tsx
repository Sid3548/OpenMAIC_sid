import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Instrument_Serif, DM_Mono } from 'next/font/google';
import './globals.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { Toaster } from '@/components/ui/sonner';
import { ServerProvidersInit } from '@/components/server-providers-init';
import { SessionProvider } from '@/components/session-provider';

const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono-dm',
  display: 'swap',
});

const siteUrl = 'https://openclassroom.online';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Open Classroom — AI Classroom for Every Student',
    template: '%s | Open Classroom',
  },
  description:
    'Universal AI-powered interactive classroom. Upload a PDF, paste a URL, or type any topic — and get a full multi-agent learning experience in 60 seconds.',
  keywords: [
    'AI classroom',
    'multi-agent learning',
    'AI tutoring',
    'interactive learning',
    'Open Classroom',
    'generative education',
    'AI teacher',
  ],
  authors: [{ name: 'Sid', url: 'https://github.com/Sid3548' }],
  creator: 'Sid3548',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Open Classroom',
    title: 'Open Classroom — AI Classroom for Every Student',
    description:
      'Multi-agent AI interactive classroom. Upload a PDF to instantly generate an immersive, full learning experience with AI teachers who lecture, quiz, and draw on a whiteboard.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Open Classroom — AI Classroom for Every Student',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Classroom — AI Classroom for Every Student',
    description:
      'Multi-agent AI interactive classroom. Learn anything in 60 seconds with AI teachers that actually teach.',
    images: ['/api/og'],
    creator: '@Sid3548',
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
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Open Classroom',
              description:
                'Universal AI-powered interactive classroom with multi-agent teachers that lecture, quiz, and draw on a whiteboard.',
              url: siteUrl,
              applicationCategory: 'EducationApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free self-hosted version available',
              },
              author: {
                '@type': 'Person',
                name: 'Sid',
                url: 'https://github.com/Sid3548',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <ThemeProvider>
            <I18nProvider>
              <ServerProvidersInit />
              {children}
              <Toaster position="top-center" />
            </I18nProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
