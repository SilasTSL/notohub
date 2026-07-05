'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, signIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard')
  }, [user, authLoading, router])

  function validate() {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) errs.email = 'Email is required.'
    if (!password) errs.password = 'Password is required.'
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
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-[2rem] font-bold text-[#1a1a1a] tracking-tight">
            NotoHub
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1.5">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] shadow-sm px-8 py-8">
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#1a1a1a]"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                placeholder="••••••••"
                autoComplete="current-password"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6b6b6b] mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-[#1a8917] font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
