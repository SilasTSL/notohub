'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Logo from '@/components/Logo'

interface NavbarProps {
  /**
   * Called before any in-app navigation this Navbar would trigger (logo
   * click, sign out). Return false to block the navigation — e.g. to warn
   * about unsaved changes — or true to let it proceed. Browser-level exits
   * (tab close/refresh) aren't covered here; pages handle those separately.
   */
  confirmNavigation?: () => boolean
}

export default function Navbar({ confirmNavigation }: NavbarProps = {}) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  function handleLogoClick(e: MouseEvent) {
    if (confirmNavigation && !confirmNavigation()) {
      e.preventDefault()
    }
  }

  async function handleSignOut() {
    if (confirmNavigation && !confirmNavigation()) return
    await signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#e6e6e6]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center" aria-label="NotoHub" onClick={handleLogoClick}>
          <Logo />
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
