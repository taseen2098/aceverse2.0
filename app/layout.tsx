import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Footer from '@/components/shared/Footer';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/providers/provider';
import Header from '@/components/shared/Header';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export const metadata: Metadata = {
  title: 'AceVerse - Exam Governance System',
  description: 'Advanced professional exam management system',
  manifest: '/manifest.json',
  icons: {
    icon: 'Logo.png',
    apple: 'Logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="blue">
      <body className={inter.className} >
        <Providers>
          <div className="flex min-h-screen flex-col">
              <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster  position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
