type LogoProps = {
  className?: string
  imgClassName?: string
  textClassName?: string
}

export default function Logo({
  className = '',
  imgClassName = 'h-8',
  textClassName = 'text-lg',
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.png" alt="" className={`${imgClassName} w-auto`} />
      <span className={`font-heading font-bold tracking-tight text-[#1a1a1a] ${textClassName}`}>
        NotoHub
      </span>
    </span>
  )
}
