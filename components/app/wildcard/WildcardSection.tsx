'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { WildcardInsertForm } from '@/components/app/wildcard/WildcardInsertForm'
import { WildcardListDesktop, WildcardListMobile } from '@/components/app/wildcard/WildcardList'
import { WildcardQuotaCard } from '@/components/app/wildcard/WildcardQuotaCard'
import { WildcardThankYou } from '@/components/app/wildcard/WildcardThankYou'
import { Button } from '@/components/ui/button'
import type { WildcardPageData } from '@/lib/app/loadWildcardPageData'
import type { WildcardInsertSuccessResult } from '@/lib/contacts/wildcardActions'

type WildcardView = 'main' | 'form' | 'thankyou'

type WildcardSectionProps = Pick<
  WildcardPageData,
  'quotaInfo' | 'assegnazione' | 'wildcards'
>

export function WildcardSection({ quotaInfo, assegnazione, wildcards }: WildcardSectionProps) {
  const router = useRouter()
  const [view, setView] = useState<WildcardView>('main')
  const [thankYouResult, setThankYouResult] = useState<WildcardInsertSuccessResult | null>(null)
  const [localQuotaInfo, setLocalQuotaInfo] = useState(quotaInfo)

  const createDisabled = quotaInfo.applies && quotaInfo.exhausted

  function openForm() {
    if (createDisabled) return
    setView('form')
  }

  function handleInsertSuccess(result: WildcardInsertSuccessResult) {
    setThankYouResult(result)
    if (localQuotaInfo.applies) {
      setLocalQuotaInfo((prev) => ({
        ...prev,
        used: prev.used + 1,
        remaining: Math.max(0, prev.remaining - 1),
        exhausted: prev.used + 1 >= prev.quota,
      }))
    }
    setView('thankyou')
  }

  function refreshAndGoMain() {
    setThankYouResult(null)
    setView('main')
    router.refresh()
  }

  function goToFormFromThankYou() {
    setThankYouResult(null)
    if (localQuotaInfo.applies && localQuotaInfo.exhausted) {
      refreshAndGoMain()
      return
    }
    setView('form')
  }

  if (view === 'thankyou' && thankYouResult) {
    return (
      <WildcardThankYou
        inserted={thankYouResult}
        quotaInfo={localQuotaInfo}
        onDone={refreshAndGoMain}
        onAddAnother={goToFormFromThankYou}
      />
    )
  }

  if (view === 'form') {
    return (
      <WildcardInsertForm
        assegnazione={assegnazione}
        onBack={() => setView('main')}
        onSuccess={handleInsertSuccess}
      />
    )
  }

  return (
    <div className="space-y-4 lg:space-y-[18px]">
      <header className="hidden lg:block">
        <h1 className="text-[19px] font-bold tracking-tight text-app-text-primary">Wildcard</h1>
        <p className="mt-0.5 text-[12.5px] text-app-text-secondary">
          Add walk-in guests and track your quota.
        </p>
      </header>

      <header className="space-y-1 lg:hidden">
        <h1 className="text-xl font-bold tracking-tight text-app-text-primary">Wildcard</h1>
      </header>

      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-5">
        <WildcardQuotaCard quotaInfo={quotaInfo} compact />
        <Button
          type="button"
          disabled={createDisabled}
          onClick={openForm}
          className="h-auto w-full shrink-0 rounded-[10px] bg-app-accent py-3.5 text-[13.5px] font-bold text-app-accent-fg hover:bg-app-accent/90 disabled:bg-app-border disabled:text-app-text-muted lg:w-auto lg:px-5 lg:py-3"
        >
          <Plus className="size-4" aria-hidden />
          Create a wildcard
        </Button>
      </div>

      {createDisabled ? (
        <p className="rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-center text-[11.5px] text-app-danger-text lg:text-left lg:text-xs">
          You&apos;ve used all your assigned wildcards. Contact a super-admin to request more.
        </p>
      ) : null}

      <div>
        <h2 className="mb-2 text-[12.5px] font-bold tracking-wide text-app-text-secondary uppercase lg:mb-2.5">
          Your wildcards so far
        </h2>
        <WildcardListMobile items={wildcards} />
        <WildcardListDesktop items={wildcards} />
      </div>
    </div>
  )
}
