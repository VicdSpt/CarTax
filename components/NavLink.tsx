'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href: string
  children: React.ReactNode
}

export default function NavLink({ href, children }: Props) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-700 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}
