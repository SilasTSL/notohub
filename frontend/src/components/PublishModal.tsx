'use client'

import { useState, useEffect } from 'react'
import { publishArticle } from '@/lib/api'

const LOADING_MESSAGES = [
  'Connecting to Notion…',
  'Fetching your page content…',
  'Parsing blocks and formatting…',
  'Processing images…',
  'Almost there…',
]

type PublishModalProps = {
  username: string
  onClose: () => void
  onPublished: () => void
}

export default function PublishModal({ username, onClose, onPublished }: PublishModalProps) {
  const [notionUrl, setNotionUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<{ notionUrl?: string; slug?: string }>({})
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    if (!loading) return
    setMsgIdx(0)
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1 < LOADING_MESSAGES.length ? i + 1 : i))
    }, 18000)
    return () => clearInterval(id)
  }, [loading])

  // Warn on tab close/refresh/navigation while publishing is in flight —
  // leaving mid-request abandons the Notion import with no way to resume it.
  useEffect(() => {
    if (!loading) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [loading])

  const published = publishedUrl !== null
  const displaySlug = slug || 'my-article-title'
  const previewUrl = `notohub.com/${username}/${displaySlug}`

  function handleSlugChange(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    setSlug(cleaned)
    setErrors((prev) => ({ ...prev, slug: undefined }))
  }

  function validate() {
    const errs: { notionUrl?: string; slug?: string } = {}
    if (!notionUrl.trim()) errs.notionUrl = 'Notion page URL is required.'
    if (!slug.trim()) errs.slug = 'Slug is required.'
    else if (slug.length < 3) errs.slug = 'Slug must be at least 3 characters.'
    return errs
  }

  async function handlePublish() {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await publishArticle(notionUrl, slug)
      setPublishedUrl(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    if (loading) return
    if (published) onPublished()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {!loading && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f9f9f9] rounded-full transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        )}

        {!published ? (
          loading ? (
            /* ── Loading panel ── */
            <div className="flex flex-col items-center py-6 text-center">
              {/* Spinner */}
              <div className="relative w-16 h-16 mb-7">
                <svg
                  className="animate-spin w-16 h-16 text-[#1a8917]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-20"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="3"
                  />
                  <path
                    className="opacity-80"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>

              <h2 className="font-heading text-xl font-bold text-[#1a1a1a] mb-2">
                Publishing your article…
              </h2>

              {/* Cycling status message */}
              <p
                key={msgIdx}
                className="text-sm text-[#6b6b6b] mb-6 animate-in fade-in duration-500"
              >
                {LOADING_MESSAGES[msgIdx]}
              </p>

              {/* Progress dots */}
              <div className="flex gap-1.5 mb-6">
                {LOADING_MESSAGES.map((_, i) => (
                  <span
                    key={i}
                    className={`block w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                      i <= msgIdx ? 'bg-[#1a8917]' : 'bg-[#e6e6e6]'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-[#b0b0b0] max-w-xs">
                Importing from Notion can take up to 2 minutes — hang tight while we fetch and format your content.
              </p>

              <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                Please don&apos;t close or refresh this page until publishing finishes.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-[#1a1a1a] mb-6">
                Publish New Article
              </h2>

              {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Notion Page URL
                  </label>
                  <input
                    type="url"
                    value={notionUrl}
                    onChange={(e) => {
                      setNotionUrl(e.target.value)
                      setErrors((prev) => ({ ...prev, notionUrl: undefined }))
                    }}
                    placeholder="https://www.notion.so/..."
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 ${
                      errors.notionUrl
                        ? 'border-red-400 bg-red-50'
                        : 'border-[#e6e6e6] bg-white'
                    }`}
                  />
                  {errors.notionUrl ? (
                    <p className="text-xs text-red-500 mt-1">{errors.notionUrl}</p>
                  ) : (
                    <p className="text-xs text-[#6b6b6b] mt-1.5">
                      Make sure this page is shared with the NotoHub integration in Notion.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="my-article-title"
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors font-mono placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 ${
                      errors.slug
                        ? 'border-red-400 bg-red-50'
                        : 'border-[#e6e6e6] bg-white'
                    }`}
                  />
                  {errors.slug ? (
                    <p className="text-xs text-red-500 mt-1">{errors.slug}</p>
                  ) : (
                    <p className="text-xs text-[#1a8917] mt-1.5 font-mono">
                      → {previewUrl}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handlePublish}
                className="mt-6 w-full bg-[#1a8917] hover:bg-[#157313] text-white font-medium py-3 rounded-lg transition-colors text-sm"
              >
                Publish Article
              </button>
            </>
          )
        ) : (
          <div className="text-center py-2">
            <div className="text-5xl mb-5">🎉</div>
            <h2 className="font-heading text-2xl font-bold text-[#1a1a1a] mb-2">
              Article published!
            </h2>
            <p className="text-sm text-[#6b6b6b] mb-6">
              Your article is now live at:
            </p>

            <div className="flex items-center gap-3 bg-[#f9f9f9] border border-[#e6e6e6] rounded-lg px-4 py-3 mb-6">
              <span className="text-sm text-[#1a8917] flex-1 text-left break-all font-mono">
                {publishedUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 text-xs font-medium text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors border border-[#e6e6e6] bg-white rounded px-2 py-1"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full border border-[#e6e6e6] text-[#1a1a1a] font-medium py-3 rounded-lg hover:bg-[#f9f9f9] transition-colors text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
