import ArticleClient from "./ArticleClient";

// Pre-renders one static file per currently-published slug so this route works
// under `output: 'export'` (static hosting has no server to render on demand).
// Articles published after the frontend's last build won't have a page here
// until the next frontend deploy — republish this app to pick up new slugs.
export async function generateStaticParams() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/articles?pageSize=100`);
    if (!res.ok) return [];
    const json: { data?: { items: { slug: string }[] } } = await res.json();
    const items = json.data?.items ?? [];
    return items.map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ArticleClient slug={params.slug} />;
}
