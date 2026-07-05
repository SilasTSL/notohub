import Link from 'next/link'
import type { ReactNode } from 'react'
import Logo from './Logo'

const APP_URL = 'https://app.notohub.com'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-20 bg-white border-b border-[#e6e6e6]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="NotoHub">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/articles"
              className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors hidden sm:block"
            >
              Articles
            </Link>
            <a href={`${APP_URL}/login`} className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
              Sign in
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="bg-[#1a8917] hover:bg-[#157313] text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              Get started
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#e6e6e6] py-8 mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo imgClassName="h-6" textClassName="text-base" />
          <p className="text-sm text-[#6b6b6b]">Publish your Notion articles to the world.</p>
          <div className="flex gap-6 text-sm text-[#6b6b6b]">
            <Link href="/articles" className="hover:text-[#1a1a1a] transition-colors">
              Articles
            </Link>
            <a href={`${APP_URL}/login`} className="hover:text-[#1a1a1a] transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
