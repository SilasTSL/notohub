import type { ArticleMetadata } from "@notohub/shared";

interface Props {
  article: ArticleMetadata;
}

const ACCENT_COLOURS = [
  '#1a8917', '#0077b6', '#c0392b', '#e67e22',
  '#7b2d8b', '#2d6a4f', '#e76f51',
]

function accentColour(title: string): string {
  const sum = Array.from(title).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ACCENT_COLOURS[sum % ACCENT_COLOURS.length]
}

export default function ArticleCard({ article }: Props) {
  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const colour = accentColour(article.title)

  // Same-domain link straight to the real, server-generated article page
  // (uploaded directly to this bucket at publish time) — not a route in this app.
  const href = `/${article.author.name}/${article.slug}/`;

  return (
    <a
      href={href}
      className="group flex flex-col rounded-xl border border-[#e6e6e6] overflow-hidden hover:border-[#1a8917] transition-colors"
    >
      {article.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div
          className="h-44 w-full flex items-center justify-center"
          style={{ backgroundColor: colour + '18' }}
        >
          <span
            className="font-serif font-bold text-7xl select-none"
            style={{ color: colour, opacity: 0.25 }}
          >
            {article.title.charAt(0).toUpperCase()}
          </span>
        </div>
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
        <h3 className="font-semibold text-[#1a1a1a] group-hover:text-[#1a8917] transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-[#6b6b6b] line-clamp-3 flex-1">{article.excerpt}</p>
        <div className="flex items-center gap-2 text-xs text-[#b0b0b0] mt-auto pt-3 border-t border-[#e6e6e6]">
          <span>{article.author.name}</span>
          <span>·</span>
          <time dateTime={article.publishedAt}>{publishedDate}</time>
        </div>
      </div>
    </a>
  );
}
