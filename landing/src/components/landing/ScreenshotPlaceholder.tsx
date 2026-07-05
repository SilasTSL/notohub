interface Props {
  label: string
  aspect?: string
  className?: string
}

/**
 * Sized, labelled slot for a real product screenshot to be dropped in later.
 * Swap for an <img> once real screenshots exist — aspect ratio is set to
 * match a typical browser window so the eventual image drops in cleanly.
 */
export default function ScreenshotPlaceholder({ label, aspect = 'aspect-[16/10]', className = '' }: Props) {
  return (
    <div
      className={`w-full ${aspect} rounded-xl border-2 border-dashed border-[#d6d6d6] bg-[#fafafa] flex flex-col items-center justify-center gap-3 text-center px-6 ${className}`}
    >
      <svg
        className="w-9 h-9 text-[#c2c2c2]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span className="text-xs font-medium text-[#b0b0b0]">{label}</span>
    </div>
  )
}
