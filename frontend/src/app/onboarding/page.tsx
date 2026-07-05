'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getNotionConnectUrl } from '@/lib/api'

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-white shrink-0 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // Notion redirects back with ?notion=connected after a successful OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('notion') === 'connected') {
      setStep(2)
    }
  }, [])

  if (loading || !user) return null

  async function handleConnectNotion() {
    setConnecting(true)
    setError(null)
    try {
      const { url } = await getNotionConnectUrl()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Notion connection')
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  s < step
                    ? 'bg-[#1a8917] text-white'
                    : s === step
                    ? 'bg-[#1a8917] text-white ring-4 ring-[#1a8917]/15'
                    : 'bg-[#e6e6e6] text-[#6b6b6b]'
                }`}
              >
                {s < step ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 2 && (
                <div className={`w-16 h-0.5 transition-colors ${step > s ? 'bg-[#1a8917]' : 'bg-[#e6e6e6]'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#6b6b6b] mb-8">Step {step} of 2</p>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] shadow-sm px-8 py-8">
          {step === 1 ? (
            <div>
              <h1 className="font-heading text-2xl font-bold text-[#1a1a1a] mb-2">
                Connect Notion
              </h1>
              <p className="text-sm text-[#6b6b6b] leading-relaxed mb-6">
                On the next screen, Notion will ask which pages to share with
                NotoHub. Select the top-level folder where your articles live
                — you&apos;ll never need to repeat this step.
              </p>

              <div className="bg-[#f0faf0] border border-[#b8ddb8] rounded-xl p-4 mb-6">
                <p className="text-sm text-[#1a1a1a] leading-relaxed">
                  <span className="font-semibold text-[#1a8917]">Tip: </span>
                  Select a parent page or your entire workspace so all future
                  articles are automatically accessible.
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectNotion}
                disabled={connecting}
                className="w-full bg-[#1a8917] hover:bg-[#157313] disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {connecting && <Spinner />}
                {connecting ? 'Opening Notion…' : 'Connect Notion Workspace →'}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#f0faf0] flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-[#1a8917]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="font-heading text-2xl font-bold text-[#1a1a1a] mb-2">
                Notion connected!
              </h1>
              <p className="text-sm text-[#6b6b6b] mb-8">
                You&apos;re ready to publish your first article.
              </p>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#1a8917] hover:bg-[#157313] text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
