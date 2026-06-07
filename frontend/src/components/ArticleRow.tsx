'use client'

import { useState } from 'react'
import type { Article } from '@/types'

export type { Article }

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
}

export default function ArticleRow({ article, username, onDelete }: ArticleRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const viewUrl = `https://www.notohub.com/${username}/${article.slug}/`

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(article.slug)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-[#e6e6e6] last:border-0 min-h-[60px]">
      {confirming ? (
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-[#1a1a1a]">
            Delete <span className="font-medium">{article.title}</span>?
          </p>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {deleting && (
                <svg className="animate-spin h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#1a1a1a] truncate">{article.title}</p>
            <p className="text-xs text-[#6b6b6b] mt-0.5 font-mono">{article.slug}</p>
          </div>
          <div className="flex items-center gap-4 ml-6 shrink-0">
            <span className="text-sm text-[#6b6b6b] hidden sm:block whitespace-nowrap">
              {formatDate(article.publishedAt)}
            </span>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#1a8917] hover:underline whitespace-nowrap"
            >
              View →
            </a>
            <button
              onClick={() => setConfirming(true)}
              className="text-[#b0b0b0] hover:text-red-500 transition-colors"
              aria-label="Delete article"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
