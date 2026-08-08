import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type AuthBackLinkProps = {
  href: string
  children?: React.ReactNode
}

export function AuthBackLink({ href, children = 'Back to login' }: AuthBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[12.5px] text-app-text-secondary transition-colors hover:text-app-text-primary"
    >
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  )
}
