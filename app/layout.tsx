import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Starfield } from '@/components/starfield/starfield';
import { createClient } from '@/lib/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Tracker',
  description: 'Monitor progress through your software engineering study guide.',
};

// Runs before paint to avoid a flash of the wrong theme. Defaults to dark.
const themeScript = `(function(){try{var s=localStorage.getItem('theme')||'dark';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Respect the per-user starfield toggle (Settings). For logged-out users the
  // starfield stays on; the login page is a dark canvas backdrop.
  let starfieldOn = true;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('settings').select('starfield_on').eq('user_id', user.id).single();
      starfieldOn = data?.starfield_on ?? true;
    }
  } catch {
    // No session or settings yet — keep the starfield.
  }

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {starfieldOn && <Starfield />}
        <div className="starfield-veil" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}