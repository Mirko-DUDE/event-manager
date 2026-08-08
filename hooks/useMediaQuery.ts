'use client'

import { useLayoutEffect, useState } from 'react'

/** Allineato al breakpoint Tailwind `lg` (fase-7 §2.2). */
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

/**
 * `null` fino al mount client — evita hydration mismatch e doppio overlay
 * (Drawer vaul usa portal e ignora `lg:hidden` sul wrapper).
 */
export function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useLayoutEffect(() => {
    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}
