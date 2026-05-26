import type { ArticleMetadata, ArticleListResponse } from "@notohub/shared";
import ArticleCard from "@/components/ArticleCard";

async function getArticles(): Promise<ArticleMetadata[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/articles?pageSize=6`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json: ArticleListResponse = await res.json();
    return json.data?.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const articles = await getArticles();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Welcome to{" "}
          <span className="text-brand-600">Notohub</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          A Notion-powered content hub. Browse articles synced directly from a
          Notion workspace.
        </p>
        <a
          href="/articles"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
        >
          Browse all articles →
        </a>
      </section>

      {/* Recent articles */}
      {articles.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Recent Articles</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
