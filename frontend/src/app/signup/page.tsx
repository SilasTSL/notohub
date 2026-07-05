'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { resendSignUpCode } from 'aws-amplify/auth'

// ─── Step 1 — Sign Up Form ───────────────────────────────────────────────────

interface Step1Props {
  onSuccess: (email: string, username: string) => void
}

function SignUpForm({ onSuccess }: Step1Props) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    username?: string
    password?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  function handleUsernameChange(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    setUsername(cleaned)
    setFieldErrors((prev) => ({ ...prev, username: undefined }))
  }

  function validate() {
    const errs: { email?: string; username?: string; password?: string } = {}
    if (!email.trim()) errs.email = 'Email is required.'
    if (!username.trim()) errs.username = 'Username is required.'
    else if (username.length < 3)
      errs.username = 'Username must be at least 3 characters.'
    if (!password) errs.password = 'Password is required.'
    else if (password.length < 8)
      errs.password = 'Password must be at least 8 characters.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setLoading(true)
    try {
      await signUp(email, password, username)
      onSuccess(email, username)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-slide-in">
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFieldErrors((prev) => ({ ...prev, email: undefined }))
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 disabled:opacity-60 disabled:cursor-not-allowed ${
              fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-[#e6e6e6]'
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1.5">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="your-username"
            autoComplete="username"
            disabled={loading}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all font-mono placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 disabled:opacity-60 disabled:cursor-not-allowed ${
              fieldErrors.username ? 'border-red-400 bg-red-50' : 'border-[#e6e6e6]'
            }`}
          />
          {fieldErrors.username ? (
            <p className="text-xs text-red-500 mt-1.5">{fieldErrors.username}</p>
          ) : (
            <p className="text-xs text-[#6b6b6b] mt-1.5">
              Your articles will live at{' '}
              <span className="text-[#1a1a1a] font-medium">
                notohub.com/{username || 'username'}
              </span>
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setFieldErrors((prev) => ({ ...prev, password: undefined }))
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 disabled:opacity-60 disabled:cursor-not-allowed ${
              fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-[#e6e6e6]'
            }`}
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1.5">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a8917] hover:bg-[#157313] disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-1 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-white shrink-0"
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
          )}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

// ─── Step 2 — Confirm Email ───────────────────────────────────────────────────

interface Step2Props {
  email: string
}

function ConfirmEmailForm({ email }: Step2Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const { confirmSignUp } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError('Please enter the confirmation code.')
      return
    }
    setLoading(true)
    try {
      await confirmSignUp(email, code.trim())
      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: email })
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    }
  }

  return (
    <div className="animate-fade-slide-in">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[#f0faf0] flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[#1a8917]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-bold text-[#1a1a1a] mb-1">
          Check your email
        </h2>
        <p className="text-sm text-[#6b6b6b]">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-[#1a1a1a]">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {resent && (
        <div className="mb-5 bg-[#f0faf0] border border-[#b8ddb8] text-[#1a8917] text-sm px-4 py-3 rounded-lg">
          Code resent — check your inbox.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError(null)
          }}
          placeholder="000000"
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-[#e6e6e6] text-center text-2xl font-mono tracking-[0.5em] outline-none transition-all placeholder:text-[#d0d0d0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 disabled:opacity-60 mb-4"
          autoFocus
        />

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full bg-[#1a8917] hover:bg-[#157313] disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-white shrink-0"
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
          )}
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>
      </form>

      <p className="text-center text-sm text-[#6b6b6b] mt-4">
        Didn&apos;t receive it?{' '}
        <button
          onClick={handleResend}
          className="text-[#1a8917] font-medium hover:underline"
          type="button"
        >
          Resend code
        </button>
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [pendingEmail, setPendingEmail] = useState('')

  function handleSignUpSuccess(email: string, _username: string) {
    setPendingEmail(email)
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-[2rem] font-bold text-[#1a1a1a] tracking-tight">
            NotoHub
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1.5">
            {step === 1 ? 'Create your account' : 'Verify your email'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] shadow-sm px-8 py-8">
          {step === 1 ? (
            <SignUpForm key="step1" onSuccess={handleSignUpSuccess} />
          ) : (
            <ConfirmEmailForm key="step2" email={pendingEmail} />
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-[#6b6b6b] mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#1a8917] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
