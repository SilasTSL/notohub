import { authFetch } from '@/lib/auth'
import type { Article, UserProfile } from '@/types'

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

export async function disconnectNotion(): Promise<void> {
  const res = await authFetch(`${API_URL}/auth/notion/disconnect`, { method: 'POST' })
  await handleResponse<{ message?: string }>(res)
}

// ─── Articles ─────────────────────────────────────────────────────────────────

interface ArticleJobStatus {
  status: 'publishing' | 'published' | 'failed'
  url: string | null
  error: string | null
}

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 2 * 60 * 1000 // matches the "up to 2 minutes" copy in the UI

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getArticleJobStatus(slug: string): Promise<ArticleJobStatus> {
  const res = await authFetch(`${API_URL}/v1/articles/${slug}`)
  const body = await handleResponse<{ data: ArticleJobStatus }>(res)
  return body.data
}

// Publishing can take longer than API Gateway's hard 29s integration
// timeout (a Notion page with several images easily can), so the backend
// starts a background job and returns immediately — this polls until it
// actually finishes instead of waiting on one long-lived request.
export async function publishArticle(
  notionUrl: string,
  slug: string
): Promise<{ url: string }> {
  const res = await authFetch(`${API_URL}/articles/publish`, {
    method: 'POST',
    body: JSON.stringify({ notionUrl, slug }),
  })
  await handleResponse<{ data: { status: string; slug: string } }>(res)

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const job = await getArticleJobStatus(slug)
    if (job.status === 'published' && job.url) return { url: job.url }
    if (job.status === 'failed') throw new Error(job.error ?? 'Publishing failed. Please try again.')
    // else still "publishing" — keep polling
  }

  throw new Error(
    "Still working on it — this is taking longer than usual. Check your dashboard in a bit; it'll show up once it's done."
  )
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

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile> {
  const res = await authFetch(`${API_URL}/profile`)
  const body = await handleResponse<{ data: UserProfile }>(res)
  return body.data
}

export async function getAvatarUploadUrl(
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const res = await authFetch(`${API_URL}/profile/avatar-upload-url`, {
    method: 'POST',
    body: JSON.stringify({ contentType }),
  })
  const body = await handleResponse<{ data: { uploadUrl: string; publicUrl: string } }>(res)
  return body.data
}

export async function saveProfile(data: {
  bio?: string
  avatarUrl?: string
  socialLinks?: { twitter?: string; github?: string; linkedin?: string }
}): Promise<{ url: string }> {
  const res = await authFetch(`${API_URL}/profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const body = await handleResponse<{ data: { url: string } }>(res)
  return body.data
}

// ─── Account ──────────────────────────────────────────────────────────────────

// Deletes all backend data (articles, profile, S3 content, user record).
// Caller must delete the Cognito login itself afterward (authDeleteUser in
// lib/auth.ts) — this only owns backend data, not the login credential.
export async function deleteAccountData(): Promise<void> {
  const res = await authFetch(`${API_URL}/account`, { method: 'DELETE' })
  await handleResponse<{ message?: string }>(res)
}
