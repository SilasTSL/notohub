'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import ProfilePreview from '@/components/ProfilePreview'
import ProfileFormFields from '@/components/ProfileFormFields'
import { useProfileForm } from '@/hooks/useProfileForm'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const profile = useProfileForm()
  const { form, previewAvatarUrl, profileLoading, loadProfile, socialErrors, saving, successUrl, saveError, handleSubmit, isDirty } = profile

  function confirmNavigation(): boolean {
    if (!isDirty) return true
    return window.confirm('You have unsaved changes. Leave without saving?')
  }

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // ── Load existing profile ───────────────────────────────────────────────
  useEffect(() => {
    if (!loading && user) loadProfile()
  }, [loading, user, loadProfile])

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

  const bioOver = form.bio.length > 280

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar confirmNavigation={confirmNavigation} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#1a1a1a]">Profile</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            This is what visitors see at{' '}
            <span className="text-[#1a8917]">notohub.com/{user.username}</span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-7">
            <ProfileFormFields username={user.username} profile={profile} />

            {isDirty && !saving && (
              <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You have unsaved changes.
              </p>
            )}

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
              disabled={saving || !form.name.trim() || bioOver || Object.keys(socialErrors).length > 0}
              className="w-full bg-[#1a8917] hover:bg-[#157313] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-lg transition-colors"
            >
              {saving ? 'Publishing…' : 'Save & Publish Profile'}
            </button>
          </form>

          {/* ── Live preview ── */}
          <aside className="w-full lg:w-72 lg:sticky lg:top-24 shrink-0">
            <ProfilePreview
              username={user.username}
              name={form.name}
              location={form.location}
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
