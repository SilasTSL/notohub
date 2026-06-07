import type { Article } from '@/types'

export type { Article }

export default function ArticleRow({ article }: { article: Article }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#e6e6e6] last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#1a1a1a] truncate">{article.title}</p>
        <p className="text-xs text-[#6b6b6b] mt-0.5 font-mono">
          {article.slug}
        </p>
      </div>
      <div className="flex items-center gap-6 ml-6 shrink-0">
        <span className="text-sm text-[#6b6b6b] hidden sm:block whitespace-nowrap">
          {article.publishedAt}
        </span>
        <a
          href="#"
          className="text-sm font-medium text-[#1a8917] hover:underline whitespace-nowrap"
        >
          View →
        </a>
      </div>
    </div>
  )
}
