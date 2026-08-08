'use client'

import { useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'

type CheckInQrScannerProps = {
  active: boolean
  paused: boolean
  onScan: (data: string) => void
  onError?: (message: string) => void
}

export function CheckInQrScanner({ active, paused, onScan, onError }: CheckInQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!active || !videoRef.current) {
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
      return
    }

    QrScanner.WORKER_PATH = new URL(
      'qr-scanner/qr-scanner-worker.min.js',
      import.meta.url,
    ).toString()

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScanRef.current(result.data)
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 5,
      },
    )

    scannerRef.current = scanner

    scanner
      .start()
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unable to access the camera.'
        onError?.(message)
      })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
    }
  }, [active, onError])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner || !active) return

    if (paused) {
      void scanner.stop()
    } else {
      void scanner.start().catch(() => {
        // Camera restart errors surface via the initial start handler.
      })
    }
  }, [active, paused])

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 size-full object-cover"
      muted
      playsInline
      aria-label="QR code camera preview"
    />
  )
}
