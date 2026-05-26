import type { ArticleMetadata, ArticleListResponse } from "@notohub/shared";
import ArticleCard from "@/components/ArticleCard";

export const metadata = { title: "Articles" };

async function getArticles(): Promise<ArticleMetadata[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/articles?pageSize=50`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json: ArticleListResponse = await res.json();
    return json.data?.items ?? [];
  } catch {
    return [];
  }
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">All Articles</h1>

      {articles.length === 0 ? (
        <p className="text-gray-500">No articles found. Check back soon!</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
