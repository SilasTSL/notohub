import { authFetch } from '@/lib/auth'
import type { Article } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(body.message ?? body.error ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Idempotent — safe to call on every sign-in. Email and username are read
// from the JWT on the backend, so no body is needed.
export async function registerUser(): Promise<void> {
  const res = await authFetch(`${API_URL}/auth/register`, { method: 'POST' })
  await handleResponse<{ message?: string }>(res)
}

// ─── Notion OAuth (post-deployment) ──────────────────────────────────────────

export async function getNotionConnectUrl(): Promise<{ url: string }> {
  const res = await authFetch(`${API_URL}/auth/notion/connect`)
  const body = await handleResponse<{ data: { url: string } }>(res)
  return body.data
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function publishArticle(
  notionUrl: string,
  slug: string
): Promise<{ url: string }> {
  const res = await authFetch(`${API_URL}/articles/publish`, {
    method: 'POST',
    body: JSON.stringify({ notionUrl, slug }),
  })
  const body = await handleResponse<{ data: { url: string } }>(res)
  return body.data
}

export async function deleteArticle(slug: string): Promise<void> {
  const res = await authFetch(`${API_URL}/v1/articles/${slug}`, { method: 'DELETE' })
  await handleResponse<{ message?: string }>(res)
}

export async function listArticles(): Promise<Article[]> {
  // /v1/articles returns the authenticated user's own articles
  const res = await authFetch(`${API_URL}/v1/articles`)
  const body = await handleResponse<{ data: Article[] }>(res)
  return body.data
}
