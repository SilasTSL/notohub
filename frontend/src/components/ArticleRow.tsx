'use client'

import { useState } from 'react'
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
}

export default function ArticleRow({ article, username, onDelete }: ArticleRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const viewUrl = `/articles/${article.slug}`
  const colour = accentColour(article.title)

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(article.slug)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col rounded-xl border border-red-200 bg-red-50 overflow-hidden">
        <div
          className="h-36 w-full flex items-center justify-center"
          style={{ backgroundColor: colour + '18' }}
        >
          <span className="font-serif font-bold text-6xl select-none" style={{ color: colour, opacity: 0.2 }}>
            {article.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#1a1a1a]">
            Delete <span className="font-medium">{article.title}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="flex-1 text-sm text-[#6b6b6b] border border-[#e6e6e6] bg-white rounded-lg py-2 hover:bg-[#f9f9f9] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
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
      </div>
    )
  }

  return (
    <div className="group flex flex-col rounded-xl border border-[#e6e6e6] overflow-hidden hover:border-[#1a8917] transition-colors">
      {/* Placeholder thumbnail */}
      <div
        className="h-36 w-full flex items-center justify-center"
        style={{ backgroundColor: colour + '18' }}
      >
        <span
          className="font-serif font-bold text-6xl select-none"
          style={{ color: colour, opacity: 0.25 }}
        >
          {article.title.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3 className="font-semibold text-[#1a1a1a] group-hover:text-[#1a8917] transition-colors line-clamp-2 text-sm leading-snug">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-[#6b6b6b] line-clamp-2">{article.excerpt}</p>
        )}
        <p className="text-xs text-[#b0b0b0] mt-auto pt-2">
          {formatDate(article.publishedAt)}
        </p>
      </div>

      {/* Actions */}
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
          onClick={() => setConfirming(true)}
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
