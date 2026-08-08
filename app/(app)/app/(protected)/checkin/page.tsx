import { SectionAccessGate } from '@/components/app/SectionAccessGate'
import { CheckInSection } from '@/components/app/checkin/CheckInSection'
import { canResendTicket, canUndoCheckIn as userCanUndoCheckIn } from '@/collections/users/canAccessSection'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

/** Check-in: scanner QR mobile + ricerca manuale desktop (Passo 7). */
export default async function CheckinPage() {
  const user = await getAuthenticatedAppUser()
  const canResend = user?.appRole ? canResendTicket({ appRole: user.appRole }) : false
  const canUndoCheckIn = user?.appRole ? userCanUndoCheckIn({ appRole: user.appRole }) : false

  return (
    <SectionAccessGate section="lettore">
      <CheckInSection canResend={canResend} canUndoCheckIn={canUndoCheckIn} />
    </SectionAccessGate>
  )
}
