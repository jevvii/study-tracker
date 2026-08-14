import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Tracker',
  description: 'Monitor progress through your software engineering study guide.',
};

// Runs before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var s=localStorage.getItem('theme')||'dark';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}