import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://5ducks.ai'),
  title: '5Ducks - Sales Gamified | Find Prospects in 5 Minutes a Day',
  description: 'Sales Gamified. Find prospects, craft emails, and close deals in just 5 minutes a day. Delete distractions and enjoy sales simplicity with 5Ducks.',
  openGraph: {
    title: '5Ducks - Sales Gamified',
    description: 'Sales Gamified. Find prospects, craft emails, and close deals in just 5 minutes a day.',
    images: ['/images/og-image.webp'],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '5Ducks - Sales Gamified',
    description: 'Sales Gamified. Find prospects, craft emails, and close deals in just 5 minutes a day.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
