import Link from 'next/link'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Faq from '@/components/landing/Faq'
import FinalCta from '@/components/landing/FinalCta'

const APP_URL = 'https://app.notohub.com'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#e6e6e6]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="NotoHub">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="NotoHub" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-5 text-sm">
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
              className="bg-[#1a8917] hover:bg-[#157313] text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <Hero />
      <Features />
      <HowItWorks />
      <Faq />
      <FinalCta />

      {/* Footer */}
      <footer className="border-t border-[#e6e6e6] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="NotoHub" className="h-6 w-auto" />
          <p className="text-sm text-[#6b6b6b] text-center">
            Write in Notion. Publish to the world.
          </p>
          <div className="flex gap-6 text-sm text-[#6b6b6b]">
            <Link href="/articles" className="hover:text-[#1a1a1a] transition-colors">
              Articles
            </Link>
            <a href={`${APP_URL}/login`} className="hover:text-[#1a1a1a] transition-colors">
              Sign in
            </a>
            <a href={`${APP_URL}/signup`} className="hover:text-[#1a1a1a] transition-colors">
              Sign up
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
