'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import { getProfile, getNotionConnectUrl, disconnectNotion, deleteAccountData } from '@/lib/api'

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin shrink-0 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function SettingsPage() {
  const { user, loading, deleteAccount } = useAuth()
  const router = useRouter()

  const [profileLoading, setProfileLoading] = useState(true)
  const [notionConnected, setNotionConnected] = useState(false)

  const [notionBusy, setNotionBusy] = useState(false)
  const [notionError, setNotionError] = useState<string | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // ── Load profile (for notionConnected) ───────────────────────────────────
  useEffect(() => {
    if (loading || !user) return
    getProfile()
      .then((p) => setNotionConnected(p.notionConnected))
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [loading, user])

  // Warn on tab close/refresh while deletion is in flight.
  useEffect(() => {
    if (!deleting) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [deleting])

  async function handleConnectNotion() {
    setNotionBusy(true)
    setNotionError(null)
    try {
      const { url } = await getNotionConnectUrl()
      window.location.href = url
    } catch (err) {
      setNotionError(err instanceof Error ? err.message : 'Failed to start Notion connection')
      setNotionBusy(false)
    }
  }

  async function handleDisconnectNotion() {
    setNotionBusy(true)
    setNotionError(null)
    try {
      await disconnectNotion()
      setNotionConnected(false)
    } catch (err) {
      setNotionError(err instanceof Error ? err.message : 'Failed to disconnect Notion')
    } finally {
      setNotionBusy(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccountData()
      await deleteAccount()
      window.location.href = 'https://www.notohub.com'
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? `${err.message} — if your data was already deleted, please contact support to finish removing your login.`
          : 'Something went wrong. Please try again.'
      )
      setDeleting(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <Spinner className="h-8 w-8 text-[#1a8917]" />
      </div>
    )
  }

  if (!user) return null

  const confirmMatches = confirmText === user.username

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 space-y-7">
        <h1 className="font-heading text-2xl font-bold text-[#1a1a1a]">Settings</h1>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
          <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Account</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#6b6b6b]">Username</dt>
              <dd className="text-[#1a1a1a] font-medium">{user.username}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#6b6b6b]">Email</dt>
              <dd className="text-[#1a1a1a] font-medium break-all">{user.email}</dd>
            </div>
          </dl>
        </div>

        {/* Notion connection */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
          <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Notion connection</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  notionConnected ? 'bg-[#1a8917]' : 'bg-[#b0b0b0]'
                }`}
              />
              <span className="text-sm text-[#1a1a1a]">
                {notionConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {notionConnected ? (
              <button
                onClick={handleDisconnectNotion}
                disabled={notionBusy}
                className="text-sm font-medium text-[#6b6b6b] border border-[#e6e6e6] hover:bg-[#f9f9f9] disabled:opacity-60 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5"
              >
                {notionBusy && <Spinner />}
                {notionBusy ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnectNotion}
                disabled={notionBusy}
                className="text-sm font-medium text-white bg-[#1a8917] hover:bg-[#157313] disabled:opacity-60 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5"
              >
                {notionBusy && <Spinner />}
                {notionBusy ? 'Opening Notion…' : 'Connect Notion'}
              </button>
            )}
          </div>
          {notionError && (
            <p className="text-xs text-red-500 mt-3">{notionError}</p>
          )}
          {notionConnected && (
            <p className="text-xs text-[#6b6b6b] mt-3">
              Disconnecting stops NotoHub from re-publishing your articles from Notion.
              Already-published articles stay live until you delete them.
            </p>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="text-sm font-semibold text-red-600 mb-2">Danger zone</h2>
          <p className="text-sm text-[#6b6b6b] mb-4">
            Permanently delete your account, profile, and every published article.
            This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg px-4 py-2 transition-colors"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-xl font-bold text-[#1a1a1a] mb-2">
              Delete your account?
            </h2>
            <p className="text-sm text-[#6b6b6b] mb-5">
              This permanently deletes your login, profile, and every published article —
              including the live pages at notohub.com/{user.username}. This cannot be undone.
            </p>

            <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
              Type <span className="font-mono font-semibold">{user.username}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-[#e6e6e6] text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 disabled:opacity-60"
            />

            {deleting && (
              <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                Deleting your account — please don&apos;t close or refresh this page.
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-red-500 mt-4">{deleteError}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 text-sm text-[#6b6b6b] border border-[#e6e6e6] bg-white rounded-lg py-2.5 hover:bg-[#f9f9f9] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!confirmMatches || deleting}
                className="flex-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting && <Spinner />}
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
