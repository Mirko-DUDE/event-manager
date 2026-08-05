'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Link sidebar Admin verso /admin/upload-csv */
export default function CsvUploadNavLink() {
  const pathname = usePathname()
  const href = '/admin/upload-csv'
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      className={`nav__link${active ? ' nav__link--active' : ''}`}
      href={href}
      prefetch={false}
    >
      Upload CSV
    </Link>
  )
}
