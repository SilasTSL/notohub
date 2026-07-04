'use client'

import { useEffect, useState } from "react";
import type { Article, ArticleDetailResponse, ArticleMetadata } from "@notohub/shared";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-[#1a8917]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

async function getArticle(slug: string): Promise<Article | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/articles/${slug}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json: ArticleDetailResponse = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function getAuthorArticles(authorName: string): Promise<ArticleMetadata[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/users/${authorName}/articles`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as ArticleMetadata[]) ?? [];
  } catch {
    return [];
  }
}

function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const AVATAR_COLOURS = [
  '#1a8917', '#0077b6', '#c0392b', '#e67e22',
  '#7b2d8b', '#2d6a4f', '#e76f51',
];
function avatarColour(name: string): string {
  const sum = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLOURS[sum % AVATAR_COLOURS.length];
}

interface Props {
  slug: string;
}

export default function ArticleClient({ slug }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [moreArticles, setMoreArticles] = useState<ArticleMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getArticle(slug).then(async (data) => {
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(data);
      const authorArticles = await getAuthorArticles(data.author.name);
      if (cancelled) return;
      setMoreArticles(authorArticles.filter((a) => a.slug !== data.slug).slice(0, 3));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-[#6b6b6b]">This article couldn&apos;t be found.</p>
        <Link href="/articles" className="text-[#1a8917] hover:underline text-sm mt-2 inline-block">
          Back to all articles
        </Link>
      </div>
    );
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mins = readingTime(article.content);
  const colour = avatarColour(article.author.name);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <article className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors mb-10"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All articles
        </Link>

        {/* Header */}
        <header className="space-y-5 mb-8">
          {article.tags.length > 0 && (
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
          )}

          <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#1a1a1a] leading-tight">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-xl text-[#6b6b6b] leading-relaxed">{article.excerpt}</p>
          )}

          {/* Author row */}
          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
              style={{ backgroundColor: colour }}
            >
              {article.author.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <a
                href={`https://www.notohub.com/${article.author.name}/`}
                className="text-sm font-medium text-[#1a1a1a] hover:text-[#1a8917] transition-colors"
              >
                {article.author.name}
              </a>
              <p className="text-xs text-[#6b6b6b]">
                <time dateTime={article.publishedAt}>{publishedDate}</time>
                {' · '}
                {mins} min read
              </p>
            </div>
          </div>
        </header>

        {/* Cover image */}
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full rounded-xl object-cover max-h-96 mb-10"
          />
        )}

        {/* Divider */}
        <hr className="border-[#e6e6e6] mb-10" />

        {/* Body */}
        <div
          className="prose-notohub"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      {/* More from this author */}
      {moreArticles.length > 0 && (
        <div className="max-w-6xl mx-auto mt-20 pt-10 border-t border-[#e6e6e6]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">
              More from {article.author.name}
            </h2>
            <a
              href={`https://www.notohub.com/${article.author.name}/`}
              className="text-sm text-[#1a8917] hover:underline"
            >
              View all →
            </a>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {moreArticles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
