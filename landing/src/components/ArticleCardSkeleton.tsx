/** Placeholder matching ArticleCard's shape, shown while the article list loads. */
export default function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-[#e6e6e6] overflow-hidden animate-pulse">
      <div className="h-44 w-full bg-[#ececec]" />
      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="h-4 bg-[#ececec] rounded w-4/5" />
        <div className="h-4 bg-[#ececec] rounded w-3/5" />
        <div className="space-y-2">
          <div className="h-3 bg-[#ececec] rounded w-full" />
          <div className="h-3 bg-[#ececec] rounded w-5/6" />
        </div>
        <div className="h-3 bg-[#ececec] rounded w-2/5 mt-auto pt-3 border-t border-[#e6e6e6]" />
      </div>
    </div>
  )
}
