/** Placeholder matching ArticleRow's default card shape, shown while the article list loads. */
export default function ArticleRowSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-[#e6e6e6] overflow-hidden animate-pulse">
      <div className="h-36 w-full bg-[#ececec]" />

      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="h-3.5 bg-[#ececec] rounded w-4/5" />
        <div className="h-3.5 bg-[#ececec] rounded w-3/5" />
        <div className="h-3 bg-[#ececec] rounded w-2/5 mt-1" />
        <div className="h-3 bg-[#ececec] rounded w-1/4 mt-auto pt-1" />
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <div className="flex-1 h-7 bg-[#ececec] rounded-lg" />
        <div className="w-7 h-7 shrink-0 bg-[#ececec] rounded-lg" />
        <div className="w-7 h-7 shrink-0 bg-[#ececec] rounded-lg" />
      </div>
    </div>
  )
}
