import type { ArticleMetadata } from "@notohub/shared";

interface Props {
  article: ArticleMetadata;
}

export default function ArticleCard({ article }: Props) {
  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <a
      href={`/articles/${article.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-brand-500 transition-colors"
    >
      {article.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="h-44 w-full object-cover"
        />
      )}
      <div className="flex flex-col gap-2 p-5 flex-1">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-3 flex-1">{article.excerpt}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <span>{article.author.name}</span>
          <span>·</span>
          <time dateTime={article.publishedAt}>{publishedDate}</time>
        </div>
      </div>
    </a>
  );
}
