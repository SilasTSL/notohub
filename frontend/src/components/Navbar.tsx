'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#e6e6e6]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-serif text-xl font-bold text-[#1a1a1a] tracking-tight"
        >
          NotoHub
        </Link>
        {user && (
          <div className="flex items-center gap-5 text-sm">
            <span className="text-[#1a1a1a] font-medium">{user.username}</span>
            <button
              onClick={handleSignOut}
              className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
