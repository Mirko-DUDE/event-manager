'use client'

import { QrCode, X } from 'lucide-react'
import { useCallback, useRef, useState, useTransition } from 'react'

import { ContactDetailOverlay } from '@/components/app/contacts/ContactDetailOverlay'
import { CheckInAlertSheet, formatCheckInAlertTime } from '@/components/app/checkin/CheckInAlertSheet'
import { CheckInQrScanner } from '@/components/app/checkin/CheckInQrScanner'
import { Button } from '@/components/ui/button'
import type { ContactOverlayData } from '@/lib/app/buildContactOverlayData'
import { parseContactsListParams } from '@/lib/app/contactsListQuery'
import { extractQrToken, parseQrFullDataPayload } from '@/lib/contacts/extractQrToken'
import { validateCheckInQr } from '@/lib/contacts/validateCheckInQr'

type MobileAlertState =
  | {
      kind: 'duplicate'
      overlay: ContactOverlayData
      displayName: string
      checkInAt: string
    }
  | { kind: 'invalid' }
  | {
      kind: 'offline'
      fallbackName?: string
      fallbackEmail?: string | null
    }

type CheckInMobileViewProps = {
  canResend: boolean
  canUndoCheckIn: boolean
}

export function CheckInMobileView({ canResend, canUndoCheckIn }: CheckInMobileViewProps) {
  const [scanning, setScanning] = useState(false)
  const [alert, setAlert] = useState<MobileAlertState | null>(null)
  const [overlay, setOverlay] = useState<ContactOverlayData | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const scanLockRef = useRef(false)

  const scannerPaused = pending || alert !== null || overlay !== null

  const handleScan = useCallback((rawData: string) => {
    if (scanLockRef.current || pending) return
    scanLockRef.current = true

    const token = extractQrToken(rawData)
    if (!token) {
      setAlert({ kind: 'invalid' })
      scanLockRef.current = false
      return
    }

    const fullDataFallback = parseQrFullDataPayload(rawData)

    startTransition(async () => {
      try {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false
        if (offline) {
          setAlert({
            kind: 'offline',
            fallbackName: fullDataFallback
              ? [fullDataFallback.firstName, fullDataFallback.lastName].filter(Boolean).join(' ')
              : undefined,
            fallbackEmail: fullDataFallback?.email,
          })
          return
        }

        const result = await validateCheckInQr(token)

        if (result.status === 'valid') {
          setOverlay(result.overlay)
          return
        }

        if (result.status === 'alreadyCheckedIn') {
          setAlert({
            kind: 'duplicate',
            overlay: result.overlay,
            displayName: result.displayName,
            checkInAt: result.checkInAt,
          })
          return
        }

        if (result.status === 'notRecognized') {
          setAlert({ kind: 'invalid' })
          return
        }

        setAlert({ kind: 'invalid' })
      } catch {
        setAlert({
          kind: 'offline',
          fallbackName: fullDataFallback
            ? [fullDataFallback.firstName, fullDataFallback.lastName].filter(Boolean).join(' ')
            : undefined,
          fallbackEmail: fullDataFallback?.email,
        })
      } finally {
        scanLockRef.current = false
      }
    })
  }, [pending])

  const dismissAlert = useCallback(() => {
    setAlert(null)
    scanLockRef.current = false
  }, [])

  const openOverlayFromDuplicate = useCallback(() => {
    if (alert?.kind !== 'duplicate') return
    setOverlay(alert.overlay)
    setAlert(null)
    scanLockRef.current = false
  }, [alert])

  const closeOverlay = useCallback(() => {
    setOverlay(null)
    scanLockRef.current = false
  }, [])

  if (!scanning) {
    return (
      <div className="flex flex-col items-center justify-center gap-3.5 px-6 py-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-app-border bg-app-surface">
          <QrCode className="size-7 text-app-text-secondary" aria-hidden />
        </div>
        <h2 className="text-base font-bold text-app-text-primary">Ready to check guests in</h2>
        <p className="max-w-[260px] text-[12.5px] leading-normal text-app-text-secondary">
          Activate the scanner and point the camera at the QR code on the guest&apos;s ticket.
        </p>
        <Button
          type="button"
          onClick={() => {
            setCameraError(null)
            setScanning(true)
          }}
          className="mt-1.5 h-auto gap-2 rounded-[10px] bg-app-accent px-[22px] py-[13px] text-[13.5px] font-bold text-app-accent-fg hover:bg-app-accent/90"
        >
          <QrCode className="size-4" aria-hidden />
          Activate scanner
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-[min(520px,calc(100dvh-220px))] overflow-hidden rounded-[10px] bg-[#111214]">
      <CheckInQrScanner
        active={scanning}
        paused={scannerPaused}
        onScan={handleScan}
        onError={setCameraError}
      />

      <div className="relative z-10 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 text-white">
          <button
            type="button"
            onClick={() => {
              setScanning(false)
              setAlert(null)
              setOverlay(null)
              scanLockRef.current = false
            }}
            className="flex size-[30px] items-center justify-center rounded-full bg-white/12 text-white"
            aria-label="Close scanner"
          >
            <X className="size-[15px]" aria-hidden />
          </button>
          <p className="text-[13px] font-semibold">Scan guest QR code</p>
          <div className="size-[30px]" aria-hidden />
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <div className="relative size-[220px]">
            <div className="absolute left-0 top-0 size-[30px] rounded-tl-lg border-l-[3px] border-t-[3px] border-white" />
            <div className="absolute right-0 top-0 size-[30px] rounded-tr-lg border-r-[3px] border-t-[3px] border-white" />
            <div className="absolute bottom-0 left-0 size-[30px] rounded-bl-lg border-b-[3px] border-l-[3px] border-white" />
            <div className="absolute bottom-0 right-0 size-[30px] rounded-br-lg border-b-[3px] border-r-[3px] border-white" />
            {!scannerPaused ? (
              <div className="absolute inset-x-1.5 top-2.5 h-0.5 animate-[app-scanline_1.8s_ease-in-out_infinite] bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
            ) : null}
          </div>
        </div>

        <p className="px-10 pb-10 text-center text-[12.5px] text-white/75">
          {cameraError ?? 'Point the camera at the QR code on the guest\u2019s ticket.'}
        </p>
      </div>

      {alert?.kind === 'duplicate' ? (
        <CheckInAlertSheet
          variant="warning"
          title="Already checked in"
          description={
            <>
              <strong className="text-app-text-primary">{alert.displayName}</strong> was already
              checked in at {formatCheckInAlertTime(alert.checkInAt)}.
            </>
          }
          primaryLabel="View contact card"
          onPrimary={openOverlayFromDuplicate}
          secondaryLabel="Keep scanning"
          onSecondary={dismissAlert}
        />
      ) : null}

      {alert?.kind === 'invalid' ? (
        <CheckInAlertSheet
          variant="danger"
          title="QR code not recognized"
          description="This code may not belong to this event, or the ticket may not exist yet."
          primaryLabel="Keep scanning"
          onPrimary={dismissAlert}
        />
      ) : null}

      {alert?.kind === 'offline' ? (
        <CheckInAlertSheet
          variant="offline"
          title="No connection"
          description={
            <>
              Unable to validate the ticket — check-in cannot be recorded without a connection.
              {alert.fallbackName ? (
                <>
                  {' '}
                  Guest on ticket:{' '}
                  <strong className="text-app-text-primary">{alert.fallbackName}</strong>
                  {alert.fallbackEmail ? ` (${alert.fallbackEmail})` : null}.
                </>
              ) : null}
            </>
          }
          primaryLabel="Keep scanning"
          onPrimary={dismissAlert}
        />
      ) : null}

      {overlay ? (
        <ContactDetailOverlay
          contact={overlay.contact}
          listParams={parseContactsListParams({})}
          canResend={canResend}
          canUndoCheckIn={canUndoCheckIn}
          publicTicketUrl={overlay.publicTicketUrl}
          whatsappShareUrl={overlay.whatsappShareUrl}
          onClose={closeOverlay}
        />
      ) : null}
    </div>
  )
}
