type AuthBrandProps = {
  title?: string
  subtitle?: string
  align?: 'center' | 'left'
}

export function AuthBrand({
  title = 'Event Manager',
  subtitle = 'Access restricted to staff',
  align = 'center',
}: AuthBrandProps) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <h1 className="text-[19px] font-bold tracking-tight text-app-text-primary lg:text-xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-[12.5px] leading-relaxed text-app-text-secondary lg:text-[13px]">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
