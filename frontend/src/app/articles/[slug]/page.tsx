import type { Article, ArticleDetailResponse } from "@notohub/shared";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

async function getArticle(slug: string): Promise<Article | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/articles/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json: ArticleDetailResponse = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.coverImageUrl ? [article.coverImageUrl] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">{article.title}</h1>
        <p className="text-lg text-gray-500">{article.excerpt}</p>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{article.author.name}</span>
          <span>·</span>
          <time dateTime={article.publishedAt}>{publishedDate}</time>
        </div>
      </header>

      {article.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="w-full rounded-xl object-cover max-h-96"
        />
      )}

      {/* Body */}
      <div
        className="prose-notohub"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}
