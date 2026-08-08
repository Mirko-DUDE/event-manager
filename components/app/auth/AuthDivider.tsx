export function AuthDivider() {
  return (
    <div className="flex items-center gap-2.5 text-[11.5px] font-medium text-app-text-muted">
      <div className="h-px flex-1 bg-app-border" aria-hidden />
      <span>or</span>
      <div className="h-px flex-1 bg-app-border" aria-hidden />
    </div>
  )
}
