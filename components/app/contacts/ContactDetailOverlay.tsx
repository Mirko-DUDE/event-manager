'use client'

import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'

import { ContactResendPanel } from '@/components/app/ContactResendPanel'
import { CheckInPill } from '@/components/app/contacts/CheckInPill'
import { ContactAvatar } from '@/components/app/contacts/ContactAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { buildContactsListHref, type ContactsListParams } from '@/lib/app/contactsListQuery'
import type { ContactDetailData } from '@/lib/app/loadContactDetail'
import { mutateContactCheckIn } from '@/lib/contacts/checkInActions'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/useMediaQuery'

type ContactDetailOverlayProps = {
  contact: ContactDetailData
  listParams: ContactsListParams
  canResend: boolean
  canUndoCheckIn: boolean
  publicTicketUrl: string | null
  whatsappShareUrl: string | null
  /** Chiusura overlay — default lista contatti con search params correnti. */
  returnHref?: string
  /** Se impostato, sostituisce la navigazione di chiusura (es. overlay inline in check-in). */
  onClose?: () => void
}

function formatCheckInDate(iso: string): string {
  const formatted = new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return formatted.replace(',', ' –')
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2.5 border-b border-app-border py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs font-semibold text-app-text-secondary">{label}</span>
      <div className="min-w-0 max-w-[62%] text-right text-[13px] font-medium break-words text-app-text-primary">
        {children}
      </div>
    </div>
  )
}

function SourcePill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-app-border bg-app-bg px-2 py-0.5 text-[10.5px] font-bold text-app-text-secondary">
      {value}
    </span>
  )
}

type ContactDetailPanelProps = Omit<ContactDetailOverlayProps, 'listParams'> & {
  onClose: () => void
  layout: 'sheet' | 'modal'
}

function ContactDetailPanel({
  contact: initialContact,
  canResend,
  canUndoCheckIn,
  publicTicketUrl,
  whatsappShareUrl,
  onClose,
  layout,
}: ContactDetailPanelProps) {
  const [contact, setContact] = useState(initialContact)
  const [checkInPending, startCheckInTransition] = useTransition()
  const [checkInError, setCheckInError] = useState<string | null>(null)

  const avatarSize = layout === 'modal' ? 'size-[42px] text-[15px]' : 'size-10 text-sm'

  function handleCheckIn() {
    setCheckInError(null)
    startCheckInTransition(async () => {
      const result = await mutateContactCheckIn(contact.id, 'checkIn')
      if (!result.ok) {
        setCheckInError(result.error)
        return
      }
      if (result.action === 'checkIn') {
        setContact((prev) => ({
          ...prev,
          checkIn: true,
          checkInAt: result.checkInAt,
          checkInByEmail: result.checkInByEmail,
        }))
      }
    })
  }

  function handleUndoCheckIn() {
    setCheckInError(null)
    startCheckInTransition(async () => {
      const result = await mutateContactCheckIn(contact.id, 'undo')
      if (!result.ok) {
        setCheckInError(result.error)
        return
      }
      setContact((prev) => ({
        ...prev,
        checkIn: false,
        checkInAt: null,
        checkInByEmail: null,
      }))
    })
  }

  const showResend =
    canResend && !contact.checkIn && publicTicketUrl && whatsappShareUrl && contact.qrToken

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-app-border',
          layout === 'modal' ? 'px-5 pb-4 pt-5' : 'px-4 pb-3.5 pt-1.5',
        )}
      >
        <ContactAvatar initials={contact.initials} className={avatarSize} />
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'truncate font-bold text-app-text-primary',
              layout === 'modal' ? 'text-base' : 'text-[15.5px]',
            )}
          >
            {contact.displayName}
          </h2>
          <CheckInPill checkedIn={contact.checkIn} className="mt-1" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-app-bg text-app-text-secondary transition-colors hover:text-app-text-primary"
          aria-label="Close contact card"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto',
          layout === 'modal' ? 'px-5 py-1.5' : 'px-4 py-1.5',
        )}
      >
        <FieldRow label="Email">{contact.email ?? '—'}</FieldRow>
        <FieldRow label="Phone">{contact.telefono ?? '—'}</FieldRow>
        <FieldRow label="Assegnazione">{contact.assegnazione ?? '—'}</FieldRow>
        <FieldRow label="DUDE Company">{contact.dudeCompany ?? '—'}</FieldRow>
        <FieldRow label="Category">{contact.category ?? '—'}</FieldRow>
        <FieldRow label="Source">
          {contact.source ? <SourcePill value={contact.source} /> : '—'}
        </FieldRow>
        {contact.checkIn && contact.checkInAt ? (
          <>
            <FieldRow label="Check-in date">{formatCheckInDate(contact.checkInAt)}</FieldRow>
            <FieldRow label="Checked in by">{contact.checkInByEmail ?? '—'}</FieldRow>
          </>
        ) : null}
      </div>

      <div
        className={cn(
          'flex shrink-0 flex-col gap-2 border-t border-app-border',
          layout === 'modal'
            ? 'px-5 py-4 pb-5'
            : 'px-4 py-3 pb-[max(18px,env(safe-area-inset-bottom))]',
        )}
      >
        {!contact.checkIn ? (
          <Button
            type="button"
            disabled={checkInPending}
            onClick={handleCheckIn}
            className="h-auto w-full rounded-[10px] bg-app-accent py-3 text-[13.5px] font-bold text-app-accent-fg hover:bg-app-accent/90"
          >
            <Check className="size-[15px] stroke-[2.5]" aria-hidden />
            {checkInPending ? 'Checking in…' : 'Check in'}
          </Button>
        ) : canUndoCheckIn ? (
          <Button
            type="button"
            variant="outline"
            disabled={checkInPending}
            onClick={handleUndoCheckIn}
            className="h-auto w-full rounded-[10px] border-app-border py-2.5 text-[12.5px] font-semibold text-app-text-secondary"
          >
            {checkInPending ? 'Undoing…' : 'Undo check-in'}
          </Button>
        ) : (
          <p className="text-[13px] font-normal text-app-text-muted">
            Only Full access can undo a check-in.
          </p>
        )}

        {checkInError ? (
          <p className="rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-sm text-app-danger-text" role="alert">
            {checkInError}
          </p>
        ) : null}

        {showResend ? (
          <ContactResendPanel
            contactId={contact.id}
            email={contact.email}
            publicTicketUrl={publicTicketUrl}
            whatsappShareUrl={whatsappShareUrl}
            ticketInviatoAt={contact.ticketInviatoAt}
          />
        ) : canResend && !contact.checkIn && !contact.qrToken ? (
          <p className="text-sm text-app-warning-text" role="status">
            Contact has no qrToken — cannot build the public ticket link.
          </p>
        ) : null}
      </div>
    </>
  )
}

export function ContactDetailOverlay({
  contact,
  listParams,
  canResend,
  canUndoCheckIn,
  publicTicketUrl,
  whatsappShareUrl,
  returnHref,
  onClose,
}: ContactDetailOverlayProps) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const closeOverlay = useCallback(() => {
    setOpen(false)
    if (onClose) {
      onClose()
      return
    }
    router.push(returnHref ?? buildContactsListHref(listParams))
  }, [listParams, onClose, returnHref, router])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeOverlay()
      } else {
        setOpen(true)
      }
    },
    [closeOverlay],
  )

  const isDesktop = useIsDesktop()

  // Drawer (vaul) portalizza overlay/body fuori dal DOM — non usare lg:hidden sul wrapper.
  if (isDesktop === null) {
    return null
  }

  const panelProps = {
    contact,
    canResend,
    canUndoCheckIn,
    publicTicketUrl,
    whatsappShareUrl,
    onClose: closeOverlay,
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[82vh] w-[400px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-[14px] border-app-border bg-app-surface p-0 shadow-xl"
        >
          <DialogTitle className="sr-only">{contact.displayName}</DialogTitle>
          <DialogDescription className="sr-only">Contact detail</DialogDescription>
          <ContactDetailPanel key={contact.id} {...panelProps} layout="modal" />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[88vh] rounded-t-[18px] border-app-border bg-app-surface px-0 pb-0 [&>div:first-child]:mt-2 [&>div:first-child]:h-1 [&>div:first-child]:w-9 [&>div:first-child]:bg-app-border">
        <DrawerTitle className="sr-only">{contact.displayName}</DrawerTitle>
        <DrawerDescription className="sr-only">Contact detail</DrawerDescription>
        <ContactDetailPanel key={contact.id} {...panelProps} layout="sheet" />
      </DrawerContent>
    </Drawer>
  )
}
