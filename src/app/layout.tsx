import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import GovShell from './GovShell';
export const metadata: Metadata = {
  title: 'Bureau of Indian Standards - AI Intelligence Platform',
  description: 'Official BIS AI-powered portal for Indian Standards compliance, gap analysis, lab finder, and regulatory navigation.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          type="text/javascript"
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          async
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'en',
                  includedLanguages: 'en,hi,mr,gu,ta,te,bn',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          fontFamily: "'Noto Sans', Arial, sans-serif",
          margin: 0,
          padding: 0,
          background: '#eef2f7',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <GovShell>{children}</GovShell>
      </body>
    </html>
  );
}