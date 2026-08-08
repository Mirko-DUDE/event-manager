import {
  canAccessSection,
  type AppRole,
  type AppSection,
} from '@/collections/users/canAccessSection'

export type AppNavItem = {
  section: AppSection
  href: string
  label: string
  title: string
  subtitle: string
}

/** Mapping sezione → route (fonte: fase-7 Passo 2, mockup shell). */
export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    section: 'lista-inviati',
    href: '/app/contatti',
    label: 'Contacts',
    title: 'Contacts list',
    subtitle: 'Browse and search all event guests.',
  },
  {
    section: 'wildcard',
    href: '/app/wildcard',
    label: 'Wildcard',
    title: 'Wildcard',
    subtitle: 'Add walk-in guests and track your quota.',
  },
  {
    section: 'lettore',
    href: '/app/checkin',
    label: 'Check-in',
    title: 'Check-in',
    subtitle: 'No camera on desktop — look up a guest and confirm manually.',
  },
]

export function getVisibleNavItems(user: { appRole: AppRole }): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => canAccessSection(user, item.section))
}

/**
 * Sidebar desktop: hostess non vede Check-in — lo scan QR è mobile/tablet (§2.9);
 * su desktop la hostess check-in via Contacts + bottone sulla scheda contatto.
 */
export function filterDesktopSidebarNavItems(
  items: AppNavItem[],
  appRole: AppRole,
): AppNavItem[] {
  return items.filter((item) => !(appRole === 'hostess' && item.section === 'lettore'))
}

export function getFirstAccessibleHref(user: { appRole: AppRole }): string | null {
  return getVisibleNavItems(user)[0]?.href ?? null
}

export function getNavItemForPathname(pathname: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => {
    if (item.href === '/app/contatti') {
      return pathname === '/app/contatti' || pathname.startsWith('/app/contatti/')
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  })
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app/contatti') {
    return pathname === '/app/contatti' || pathname.startsWith('/app/contatti/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
