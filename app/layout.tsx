import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import NavLink from '@/components/NavLink'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaxeCar — Calculateur de taxes auto Bruxelles',
  description: 'Calculez votre TMC et taxe de circulation pour la Région de Bruxelles-Capitale',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-blue-700 text-lg">🚗 TaxeCar</Link>
            <div className="flex gap-2 ml-auto">
              <NavLink href="/">Calculateur</NavLink>
              <NavLink href="/comparaison">Comparaison</NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
