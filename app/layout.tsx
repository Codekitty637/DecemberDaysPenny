// app/layout.tsx
import './globals.css';
import { Inter, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';          // ✅ correct
import { SpeedInsights } from '@vercel/speed-insights/next';  // ✅ optional

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata = {
  title: 'Kdays',
  description: '15 Days of Keenan',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights /> {/* remove this line if you didn’t install it */}
      </body>
    </html>
  );
}
