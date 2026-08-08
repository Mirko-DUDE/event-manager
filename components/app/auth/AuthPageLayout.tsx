type AuthPageLayoutProps = {
  children: React.ReactNode
}

/** Canvas pre-auth condiviso (mockup login / reset — full page, no shell). */
export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f0f0f2] px-4 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-5">{children}</div>
    </main>
  )
}
