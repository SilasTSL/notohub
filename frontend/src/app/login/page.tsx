'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const { login } = useAuth()
  const router = useRouter()

  function validate() {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) errs.email = 'Email is required.'
    if (!password) errs.password = 'Password is required.'
    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
    login(email, username)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-[2rem] font-bold text-[#1a1a1a] tracking-tight">
            NotoHub
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1.5">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e6e6e6] shadow-sm px-8 py-8">
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
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-[#e6e6e6]'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>
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
                  setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all placeholder:text-[#b0b0b0] focus:border-[#1a8917] focus:ring-2 focus:ring-[#1a8917]/10 ${
                  errors.password ? 'border-red-400 bg-red-50' : 'border-[#e6e6e6]'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a8917] hover:bg-[#157313] text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-1"
            >
              Sign in
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
