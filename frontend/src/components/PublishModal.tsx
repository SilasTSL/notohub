'use client'

import { useState } from 'react'

type PublishModalProps = {
  username: string
  onClose: () => void
}

export default function PublishModal({ username, onClose }: PublishModalProps) {
  const [notionUrl, setNotionUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [published, setPublished] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<{ notionUrl?: string; slug?: string }>({})

  const displaySlug = slug || 'my-article-title'
  const liveUrl = `notohub.com/${username}/${displaySlug}`

  function validate() {
    const errs: { notionUrl?: string; slug?: string } = {}
    if (!notionUrl.trim()) errs.notionUrl = 'Notion page URL is required.'
    if (!slug.trim()) errs.slug = 'Slug is required.'
    return errs
  }

  function handlePublish() {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setPublished(true)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`https://${liveUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f9f9f9] rounded-full transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {!published ? (
          <>
            <h2 className="font-serif text-2xl font-bold text-[#1a1a1a] mb-6">
              Publish New Article
            </h2>

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
                {errors.notionUrl && (
                  <p className="text-xs text-red-500 mt-1">{errors.notionUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setErrors((prev) => ({ ...prev, slug: undefined }))
                  }}
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
                    → {liveUrl}
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
        ) : (
          <div className="text-center py-2">
            <div className="text-5xl mb-5">🎉</div>
            <h2 className="font-serif text-2xl font-bold text-[#1a1a1a] mb-2">
              Article published!
            </h2>
            <p className="text-sm text-[#6b6b6b] mb-6">
              Your article is now live at:
            </p>

            <div className="flex items-center gap-3 bg-[#f9f9f9] border border-[#e6e6e6] rounded-lg px-4 py-3 mb-6">
              <span className="text-sm text-[#1a8917] flex-1 text-left break-all font-mono">
                https://{liveUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 text-xs font-medium text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors border border-[#e6e6e6] bg-white rounded px-2 py-1"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={onClose}
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
