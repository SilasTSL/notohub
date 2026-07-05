'use client'

import { useState, useEffect } from 'react'
import type { Article } from '@/types'

export type { Article }

const ACCENT_COLOURS = [
  '#1a8917', '#0077b6', '#c0392b', '#e67e22',
  '#7b2d8b', '#2d6a4f', '#e76f51',
]
function accentColour(title: string): string {
  const sum = Array.from(title).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ACCENT_COLOURS[sum % ACCENT_COLOURS.length]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

type ArticleRowProps = {
  article: Article
  username: string
  onDelete: (slug: string) => Promise<void>
  onRefresh: (article: Article) => Promise<void>
}

export default function ArticleRow({ article, username, onDelete, onRefresh }: ArticleRowProps) {
  const [mode, setMode] = useState<'view' | 'confirm-delete' | 'confirm-refresh'>('view')
  const [busy, setBusy] = useState(false)

  const viewUrl = `https://www.notohub.com/${username}/${article.slug}/`
  const colour = accentColour(article.title)

  // Warn on tab close/refresh/navigation mid delete-or-republish — leaving
  // partway through can abandon the operation in an inconsistent state.
  useEffect(() => {
    if (!busy) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [busy])

  async function handleDelete() {
    setBusy(true)
    try {
      await onDelete(article.slug)
    } finally {
      setBusy(false)
      setMode('view')
    }
  }

  async function handleRefresh() {
    setBusy(true)
    try {
      await onRefresh(article)
    } finally {
      setBusy(false)
      setMode('view')
    }
  }

  // ── Delete confirmation ─────────────────────────────────────────────────
  if (mode === 'confirm-delete') {
    return (
      <div className="flex flex-col rounded-xl border border-red-200 bg-red-50 overflow-hidden">
        <div className="h-36 w-full flex items-center justify-center" style={{ backgroundColor: colour + '18' }}>
          <span className="font-heading font-bold text-6xl select-none" style={{ color: colour, opacity: 0.2 }}>
            {article.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#1a1a1a]">
            Delete <span className="font-medium">{article.title}</span>?
          </p>
          {busy && (
            <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              Please don&apos;t close or refresh this page until deleting finishes.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('view')}
              disabled={busy}
              className="flex-1 text-sm text-[#6b6b6b] border border-[#e6e6e6] bg-white rounded-lg py-2 hover:bg-[#f9f9f9] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              {busy && (
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Refresh confirmation ────────────────────────────────────────────────
  if (mode === 'confirm-refresh') {
    return (
      <div className="flex flex-col rounded-xl border border-[#1a8917] bg-[#f0faf0] overflow-hidden">
        <div className="h-36 w-full flex items-center justify-center" style={{ backgroundColor: colour + '18' }}>
          <span className="font-heading font-bold text-6xl select-none" style={{ color: colour, opacity: 0.2 }}>
            {article.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {busy ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <svg className="animate-spin h-5 w-5 text-[#1a8917]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-[#1a8917] font-medium text-center">
                Re-publishing from Notion…<br />
                <span className="text-[#6b6b6b] font-normal">This can take up to 2 minutes.</span>
              </p>
              <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                Please don&apos;t close or refresh this page until it finishes.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#1a1a1a]">
                Re-publish <span className="font-medium">{article.title}</span> from Notion?
              </p>
              {!article.notionLink && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  No Notion URL stored for this article. Please delete and re-publish it.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('view')}
                  className="flex-1 text-sm text-[#6b6b6b] border border-[#e6e6e6] bg-white rounded-lg py-2 hover:bg-[#f9f9f9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={!article.notionLink}
                  className="flex-1 text-sm font-medium text-white bg-[#1a8917] hover:bg-[#157313] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2 transition-colors"
                >
                  Re-publish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Default card view ───────────────────────────────────────────────────
  return (
    <div className="group flex flex-col rounded-xl border border-[#e6e6e6] overflow-hidden hover:border-[#1a8917] transition-colors">
      <div className="h-36 w-full flex items-center justify-center" style={{ backgroundColor: colour + '18' }}>
        <span className="font-heading font-bold text-6xl select-none" style={{ color: colour, opacity: 0.25 }}>
          {article.title.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3 className="font-semibold text-[#1a1a1a] group-hover:text-[#1a8917] transition-colors line-clamp-2 text-sm leading-snug">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-[#6b6b6b] line-clamp-2">{article.excerpt}</p>
        )}
        <p className="text-xs font-mono text-[#b0b0b0] truncate" title={article.slug}>
          /{article.slug}
        </p>
        <p className="text-xs text-[#b0b0b0] mt-auto pt-2">
          {formatDate(article.publishedAt)}
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-xs font-medium text-[#1a8917] border border-[#1a8917] rounded-lg py-1.5 hover:bg-[#f0faf0] transition-colors"
        >
          View →
        </a>
        <button
          onClick={() => setMode('confirm-refresh')}
          className="p-1.5 text-[#b0b0b0] hover:text-[#1a8917] transition-colors rounded-lg hover:bg-[#f0faf0]"
          aria-label="Refresh article from Notion"
          title="Re-publish from Notion"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => setMode('confirm-delete')}
          className="p-1.5 text-[#b0b0b0] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          aria-label="Delete article"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
