'use client'

import { useCallback, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

type PublicTicketLinkCopyProps = {
  publicTicketUrl: string
  className?: string
}

export function PublicTicketLinkCopy({ publicTicketUrl, className }: PublicTicketLinkCopyProps) {
  const [copyPending, setCopyPending] = useState(false)

  const copyTicketUrl = useCallback(async () => {
    setCopyPending(true)
    try {
      await navigator.clipboard.writeText(publicTicketUrl)
      toast.success('Link copied to clipboard.')
    } catch {
      toast.error('Could not copy to clipboard.')
    } finally {
      setCopyPending(false)
    }
  }, [publicTicketUrl])

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[11px] font-semibold text-app-text-muted">Public ticket link</p>
      <div className="flex gap-1.5">
        <input
          type="text"
          readOnly
          value={publicTicketUrl}
          aria-label="Public ticket page URL"
          className="min-w-0 flex-1 truncate rounded-[10px] border border-app-border bg-app-bg px-2.5 py-2 text-[11px] font-medium text-app-text-secondary"
          onFocus={(event) => event.target.select()}
        />
        <button
          type="button"
          disabled={copyPending}
          onClick={() => void copyTicketUrl()}
          className="flex shrink-0 items-center gap-1 rounded-[10px] border border-app-border bg-app-surface px-2.5 py-2 text-xs font-bold text-app-text-primary transition-colors hover:bg-app-bg disabled:opacity-60"
        >
          <Copy className="size-3.5" aria-hidden />
          {copyPending ? '…' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
