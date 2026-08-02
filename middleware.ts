import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PUBLIC_APP_PREFIXES = ['/app/login']

function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/app') || isPublicAppPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('payload-token')?.value
  if (!token) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/app/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*'],
}
