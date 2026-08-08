'use client'

import { useIsDesktop } from '@/hooks/useMediaQuery'

import { CheckInDesktopView } from '@/components/app/checkin/CheckInDesktopView'
import { CheckInMobileView } from '@/components/app/checkin/CheckInMobileView'

type CheckInSectionProps = {
  canResend: boolean
  canUndoCheckIn: boolean
}

export function CheckInSection({ canResend, canUndoCheckIn }: CheckInSectionProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop === null) {
    return null
  }

  if (isDesktop) {
    return <CheckInDesktopView canResend={canResend} canUndoCheckIn={canUndoCheckIn} />
  }

  return <CheckInMobileView canResend={canResend} canUndoCheckIn={canUndoCheckIn} />
}
