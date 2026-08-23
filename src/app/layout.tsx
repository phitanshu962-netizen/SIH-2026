import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import GovShell from './GovShell';

export const metadata: Metadata = {
  title: 'NiyamAI - Bureau of Indian Standards Intelligence Platform',
  description: 'NiyamAI official AI-powered portal for Indian Standards compliance, gap analysis, lab finder, and regulatory navigation.',
  icons: {
    icon: '/niyam ai.png',
    shortcut: '/niyam ai.png',
    apple: '/niyam ai.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/niyam ai.png" type="image/png" />
        <link rel="shortcut icon" href="/niyam ai.png" />
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
        suppressHydrationWarning
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