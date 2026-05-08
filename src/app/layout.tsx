import type { Metadata } from 'next'
import { Outfit, DM_Sans } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800', '900'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Glotones 593 — Hamburguesas Smash',
  description: 'Las mejores hamburguesas smash de Ecuador.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="font-body bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
