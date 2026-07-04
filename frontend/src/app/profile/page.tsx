'use client'

import { useEffect, useRef, useState, useCallback, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import { getProfile, getAvatarUploadUrl, saveProfile } from '@/lib/api'

// ── SVG icons for preview panel ───────────────────────────────────────────────

function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.647.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

// ── Avatar initial colour — same deterministic logic as the server template ───

const INITIAL_COLOURS = [
  '#1a8917', '#0077b6', '#c0392b', '#e67e22',
  '#7b2d8b', '#2d6a4f', '#e76f51',
]

function avatarColour(username: string): string {
  const sum = Array.from(username).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return INITIAL_COLOURS[sum % INITIAL_COLOURS.length]
}

// ── Live preview panel ────────────────────────────────────────────────────────

interface PreviewProps {
  username: string
  bio: string
  avatarUrl: string
  socialLinks: { twitter: string; github: string; linkedin: string }
}

function ProfilePreview({ username, bio, avatarUrl, socialLinks }: PreviewProps) {
  const initial = username ? username[0].toUpperCase() : '?'
  const colour = avatarColour(username)

  return (
    <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6b6b6b] mb-5">
        Preview
      </p>

      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-[#e6e6e6]"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-serif font-semibold select-none"
          style={{ backgroundColor: colour }}
        >
          {initial}
        </div>
      )}

      {/* Username */}
      <p className="font-serif text-lg font-semibold text-[#1a1a1a] mb-1">{username || '—'}</p>

      {/* Bio */}
      {bio && (
        <p className="text-sm text-[#6b6b6b] leading-relaxed max-w-xs mx-auto mb-3">{bio}</p>
      )}

      {/* Social icons */}
      {(socialLinks.twitter || socialLinks.github || socialLinks.linkedin) && (
        <div className="flex gap-3 justify-center text-[#6b6b6b] mt-2">
          {socialLinks.twitter && (
            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <TwitterIcon />
            </a>
          )}
          {socialLinks.github && (
            <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <GithubIcon />
            </a>
          )}
          {socialLinks.linkedin && (
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <LinkedinIcon />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface FormState {
  bio: string
  avatarUrl: string
  socialLinks: { twitter: string; github: string; linkedin: string }
}

const URL_RE = /^https?:\/\/.+/i

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    bio: '',
    avatarUrl: '',
    socialLinks: { twitter: '', github: '', linkedin: '' },
  })
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const [profileLoading, setProfileLoading] = useState(true)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // ── Load existing profile ───────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const profile = await getProfile()
      setForm({
        bio: profile.bio ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        socialLinks: {
          twitter: profile.socialLinks?.twitter ?? '',
          github: profile.socialLinks?.github ?? '',
          linkedin: profile.socialLinks?.linkedin ?? '',
        },
      })
      setPreviewAvatarUrl(profile.avatarUrl ?? '')
    } catch {
      // Non-fatal — user may not have a profile yet
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && user) loadProfile()
  }, [loading, user, loadProfile])

  // ── Cleanup blob URL on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // ── Avatar upload ───────────────────────────────────────────────────────
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File must be smaller than 5 MB.')
      return
    }

    setAvatarError(null)

    // Instant local preview
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const blobUrl = URL.createObjectURL(file)
    blobUrlRef.current = blobUrl
    setPreviewAvatarUrl(blobUrl)
    setAvatarUploading(true)

    try {
      const { uploadUrl, publicUrl } = await getAvatarUploadUrl(file.type)

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`)
      }

      // Upload succeeded — switch to the permanent public URL
      URL.revokeObjectURL(blobUrl)
      blobUrlRef.current = null
      setPreviewAvatarUrl(publicUrl)
      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }))
    } catch {
      setAvatarError('Upload failed. Please try again.')
      // Revert preview to previous saved URL
      URL.revokeObjectURL(blobUrl)
      blobUrlRef.current = null
      setPreviewAvatarUrl(form.avatarUrl)
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Social URL validation on blur ───────────────────────────────────────
  function validateSocialUrl(field: string, value: string) {
    if (value && !URL_RE.test(value)) {
      setSocialErrors((prev) => ({
        ...prev,
        [field]: 'Must be a valid URL starting with http:// or https://',
      }))
    } else {
      setSocialErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Block submit if social URLs are invalid
    if (Object.keys(socialErrors).length > 0) return

    setSaving(true)
    setSaveError(null)
    setSuccessUrl(null)

    try {
      const payload: Parameters<typeof saveProfile>[0] = {}

      if (form.bio) payload.bio = form.bio
      if (form.avatarUrl) payload.avatarUrl = form.avatarUrl
      const sl = form.socialLinks
      if (sl.twitter || sl.github || sl.linkedin) {
        payload.socialLinks = {}
        if (sl.twitter) payload.socialLinks.twitter = sl.twitter
        if (sl.github) payload.socialLinks.github = sl.github
        if (sl.linkedin) payload.socialLinks.linkedin = sl.linkedin
      }

      const { url } = await saveProfile(payload)
      setSuccessUrl(url)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#1a8917]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!user) return null

  const bioLength = form.bio.length
  const bioOver = bioLength > 280

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-[#1a1a1a]">Set Up Your Profile</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            This is what visitors see at{' '}
            <span className="text-[#1a8917]">notohub.com/{user.username}</span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-7">

            {/* Avatar */}
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
              <label className="block text-sm font-semibold text-[#1a1a1a] mb-4">
                Profile Photo
              </label>
              <div className="flex items-center gap-5">
                {/* Circle preview */}
                <div className="relative shrink-0">
                  {previewAvatarUrl ? (
                    <img
                      src={previewAvatarUrl}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-[#e6e6e6]"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-serif font-semibold select-none"
                      style={{ backgroundColor: avatarColour(user.username) }}
                    >
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <div>
                  <label
                    htmlFor="avatar-input"
                    className="cursor-pointer inline-block bg-white border border-[#e6e6e6] hover:border-[#1a8917] text-[#1a1a1a] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {avatarUploading ? 'Uploading…' : 'Upload photo'}
                  </label>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                  <p className="text-xs text-[#6b6b6b] mt-1.5">JPEG, PNG or WebP · max 5 MB</p>
                  {avatarError && (
                    <p className="text-xs text-red-500 mt-1">{avatarError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
              <label htmlFor="bio" className="block text-sm font-semibold text-[#1a1a1a] mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                maxLength={280}
                placeholder="Tell readers a bit about yourself…"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full border border-[#e6e6e6] rounded-lg px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#1a8917] resize-none transition-colors"
              />
              <p className={`text-xs mt-1 text-right ${bioOver ? 'text-red-500' : 'text-[#6b6b6b]'}`}>
                {bioLength}/280
              </p>
            </div>

            {/* Social links */}
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6 space-y-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">Social Links</p>

              {(
                [
                  { field: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
                  { field: 'github', label: 'GitHub', placeholder: 'https://github.com/yourname' },
                  { field: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourname' },
                ] as const
              ).map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label htmlFor={`social-${field}`} className="block text-xs font-medium text-[#6b6b6b] mb-1">
                    {label}
                  </label>
                  <input
                    id={`social-${field}`}
                    type="url"
                    placeholder={placeholder}
                    value={form.socialLinks[field]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, [field]: e.target.value },
                      }))
                    }
                    onBlur={(e) => validateSocialUrl(field, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none transition-colors ${
                      socialErrors[field]
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-[#e6e6e6] focus:border-[#1a8917]'
                    }`}
                  />
                  {socialErrors[field] && (
                    <p className="text-xs text-red-500 mt-1">{socialErrors[field]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Success / Error banners */}
            {successUrl && (
              <div className="rounded-lg bg-[#f0faf0] border border-[#b8ddb8] px-4 py-3 text-sm text-[#1a8917]">
                Profile published!{' '}
                <a
                  href={successUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  View your profile →
                </a>
              </div>
            )}
            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {saveError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || bioOver || Object.keys(socialErrors).length > 0}
              className="w-full bg-[#1a8917] hover:bg-[#157313] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-lg transition-colors"
            >
              {saving ? 'Publishing…' : 'Save & Publish Profile'}
            </button>
          </form>

          {/* ── Live preview ── */}
          <aside className="w-full lg:w-72 lg:sticky lg:top-24 shrink-0">
            <ProfilePreview
              username={user.username}
              bio={form.bio}
              avatarUrl={previewAvatarUrl}
              socialLinks={form.socialLinks}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
