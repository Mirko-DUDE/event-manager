import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthFieldProps = {
  id: string
  label: string
  type?: React.HTMLInputTypeAttribute
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  hasError?: boolean
  hint?: string
}

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  hasError,
  hint,
}: AuthFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs font-semibold text-app-text-secondary">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-invalid={hasError || undefined}
        className={cn(
          // text-base su mobile: iOS Safari zooma se font-size < 16px (fix-mobile-iphone §1).
          'h-auto rounded-[10px] border-app-border bg-app-surface px-3 py-2.5 text-base shadow-none focus-visible:border-app-text-primary focus-visible:ring-2 focus-visible:ring-app-text-primary/20 md:text-[13.5px]',
          hasError && 'border-app-danger-text',
        )}
      />
      {hint ? <p className="mt-1 text-[11.5px] text-app-text-muted">{hint}</p> : null}
    </div>
  )
}
