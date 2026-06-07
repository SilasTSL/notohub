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

export async function registerUser(
  email: string,
  username: string
): Promise<void> {
  // Called after email confirmation — user is signed in via autoSignIn at this
  // point, so we include the Bearer token so the backend can extract the sub.
  const res = await authFetch(`${API_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, username }),
  })
  await handleResponse<{ message?: string }>(res)
}

// ─── Notion OAuth (post-deployment) ──────────────────────────────────────────

export async function getNotionConnectUrl(): Promise<{ url: string }> {
  const res = await authFetch(`${API_URL}/auth/notion/connect`)
  return handleResponse<{ url: string }>(res)
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
  return handleResponse<{ url: string }>(res)
}

export async function listArticles(): Promise<Article[]> {
  // /v1/articles returns the authenticated user's own articles
  const res = await authFetch(`${API_URL}/v1/articles`)
  const body = await handleResponse<{ data: Article[] }>(res)
  return body.data
}
