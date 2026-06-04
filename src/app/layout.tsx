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

// --- METADATA OPTIMIZADA PARA SEO Y COMPARTIR EN REDES ---
export const metadata: Metadata = {
  title: 'Glotones 593 | Las mejores Smash Burgers',
  description: 'Pide online las mejores smash burgers y birria burgers en Guayaquil. Visítanos en Ciudad del Río 1 o pide por delivery directo a tu puerta.',
  keywords: ['hamburguesas', 'smash burgers', 'birria burgers', 'comida a domicilio', 'Guayaquil', 'Ciudad del Río', 'Alborada', 'Sauces', 'Glotones 593', 'comida rápida'],
  openGraph: {
    title: 'Glotones 593 | Hamburguesas Smash',
    description: 'Pide online las mejores smash burgers de Guayaquil. Delivery y retiro.',
    url: 'https://www.glotones593.com',
    siteName: 'Glotones 593',
    images: [
      {
        // IMPORTANTE: Cambia esto por la URL de una foto real de tu mejor hamburguesa o tu logo
        url: 'https://www.glotones593.com/logo-glotones.jpg', 
        width: 800,
        height: 600,
        alt: 'Glotones 593 Smash Burgers'
      },
    ],
    locale: 'es_EC',
    type: 'website',
  },
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