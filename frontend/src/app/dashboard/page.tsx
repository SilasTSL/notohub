'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import ArticleRow from '@/components/ArticleRow'
import PublishModal from '@/components/PublishModal'
import { listArticles, deleteArticle, publishArticle, getProfile } from '@/lib/api'
import type { Article } from '@/types'

function Spinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-[#1a8917]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [profilePublished, setProfilePublished] = useState<boolean | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true)
    try {
      const data = await listArticles()
      setArticles(data)
    } catch {
      // Leave the list empty on error — user can still publish
    } finally {
      setArticlesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && user) {
      loadArticles()
      getProfile()
        .then((p) => {
          setProfilePublished(p.profilePublished)
          setAvatarUrl(p.avatarUrl ?? null)
        })
        .catch(() => setProfilePublished(false))
    }
  }, [loading, user, loadArticles])

  async function handleDeleteArticle(slug: string) {
    await deleteArticle(slug)
    setArticles((prev) => prev.filter((a) => a.slug !== slug))
  }

  async function handleRefreshArticle(article: Article) {
    if (!article.notionLink) return
    await publishArticle(article.notionLink, article.slug)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return null

  const initial = user.username.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-7 items-start">

          {/* ── Sidebar ── */}
          <aside className="hidden md:flex w-60 shrink-0">
            <div className="w-full bg-white rounded-2xl border border-[#e6e6e6] p-5 flex flex-col">
              {/* Avatar + info */}
              <div className="flex flex-col items-center text-center pb-5 border-b border-[#e6e6e6]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.username}
                    className="w-14 h-14 rounded-full object-cover mb-3 border border-[#e6e6e6]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#1a8917] flex items-center justify-center text-white text-xl font-bold mb-3 select-none">
                    {initial}
                  </div>
                )}
                <p className="font-semibold text-[#1a1a1a] text-sm">
                  {user.username}
                </p>
                <p className="text-xs text-[#6b6b6b] mt-0.5 break-all">
                  {user.email}
                </p>
              </div>

              {/* Nav */}
              <nav className="mt-4 space-y-1 flex-1">
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#f0faf0] text-[#1a8917] text-sm font-medium"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  My Articles
                </a>
                <a
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#6b6b6b] hover:bg-[#f9f9f9] text-sm transition-colors"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Set Up Profile
                  {profilePublished === false && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#1a8917] shrink-0" />
                  )}
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#6b6b6b] hover:bg-[#f9f9f9] text-sm transition-colors"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </a>
              </nav>

              {/* Blog link */}
              <div className="pt-4 border-t border-[#e6e6e6] mt-4">
                <a
                  href={`https://www.notohub.com/${user.username}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#1a8917] hover:underline"
                >
                  View my blog →
                </a>
              </div>
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="flex-1 min-w-0">
            {/* Heading row */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="font-heading text-2xl font-bold text-[#1a1a1a]">
                My Articles
              </h1>
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#1a8917] hover:bg-[#157313] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Publish New Article
              </button>
            </div>

            {/* Article grid */}
            {articlesLoading ? (
              <div className="py-20 flex justify-center">
                <Spinner />
              </div>
            ) : articles.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleRow key={article.id} article={article} username={user.username} onDelete={handleDeleteArticle} onRefresh={handleRefreshArticle} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#e6e6e6] px-6">
                <div className="py-20 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f9f9f9] flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#b0b0b0]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-[#6b6b6b] mb-5">
                    No articles yet. Publish your first one!
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#1a8917] hover:bg-[#157313] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Publish New Article
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <PublishModal
          username={user.username}
          onClose={() => setShowModal(false)}
          onPublished={loadArticles}
        />
      )}
    </div>
  )
}
