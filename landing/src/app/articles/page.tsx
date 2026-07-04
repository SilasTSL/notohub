'use client'

import { useEffect, useState } from "react";
import type { ArticleMetadata, ArticleListResponse } from "@notohub/shared";
import ArticleCard from "@/components/ArticleCard";

const API_URL = "https://api.notohub.com";

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-[#1a8917]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

async function getArticles(): Promise<ArticleMetadata[]> {
  try {
    const res = await fetch(`${API_URL}/articles?pageSize=50`);
    if (!res.ok) return [];
    const json: ArticleListResponse = await res.json();
    return json.data?.items ?? [];
  } catch {
    return [];
  }
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArticles().then((items) => {
      setArticles(items);
      setLoading(false);
    });
  }, []);

  const [featured, ...rest] = articles;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Page header */}
      <div className="border-b border-[#e6e6e6] pb-8">
        <h1 className="font-serif text-4xl font-bold text-[#1a1a1a] tracking-tight">Articles</h1>
        <p className="text-[#6b6b6b] mt-2 text-lg">
          Ideas, stories, and tutorials — published straight from Notion.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner />
        </div>
      ) : articles.length === 0 ? (
        <p className="text-[#6b6b6b]">No articles yet. Check back soon!</p>
      ) : (
        <>
          {/* Featured / latest article */}
          {featured && (
            <a
              href={`/${featured.author.name}/${featured.slug}/`}
              className="group grid sm:grid-cols-2 rounded-2xl border border-[#e6e6e6] overflow-hidden hover:border-[#1a8917] transition-colors"
            >
              {featured.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.coverImageUrl}
                  alt={featured.title}
                  className="w-full h-60 sm:h-full object-cover"
                />
              ) : (
                <div className="w-full h-60 sm:h-72 bg-gradient-to-br from-[#f0faf0] to-[#dcfce7] flex items-center justify-center">
                  <span className="font-serif font-bold text-[10rem] text-[#1a8917] opacity-20 select-none leading-none">
                    {featured.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-8 flex flex-col justify-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#1a8917]">
                  Latest
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#1a1a1a] group-hover:text-[#1a8917] transition-colors leading-snug">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-[#6b6b6b] text-sm leading-relaxed line-clamp-3">
                    {featured.excerpt}
                  </p>
                )}
                {featured.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {featured.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-[#b0b0b0]">
                  {featured.author.name}
                  {' · '}
                  {new Date(featured.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </a>
          )}

          {/* Rest of the articles */}
          {rest.length > 0 && (
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#1a1a1a] mb-6">
                More articles
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
