import Link from 'next/link'

const APP_URL = 'https://app.notohub.com'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#e6e6e6]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-heading text-xl font-bold text-[#1a1a1a] tracking-tight">
            NotoHub
          </span>
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

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="font-heading text-5xl sm:text-6xl font-bold text-[#1a1a1a] tracking-tight leading-tight">
          Your Notion notes,
          <br />
          published to the world
        </h1>
        <p className="mt-6 text-xl text-[#6b6b6b] max-w-xl mx-auto leading-relaxed">
          NotoHub turns your Notion pages into a clean public blog.
          Write in Notion, publish in one click.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`${APP_URL}/signup`}
            className="bg-[#1a8917] hover:bg-[#157313] text-white px-8 py-3.5 rounded-lg font-medium transition-colors text-base"
          >
            Start publishing for free
          </a>
          <Link
            href="/articles"
            className="border border-[#e6e6e6] hover:border-[#1a8917] text-[#1a1a1a] px-8 py-3.5 rounded-lg font-medium transition-colors text-base"
          >
            Browse articles
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#e6e6e6] bg-[#f9f9f9] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center text-[#1a1a1a] mb-14">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-10 text-center">
            {[
              {
                n: '1',
                title: 'Write in Notion',
                body: 'Create your article as a Notion page, exactly as you normally would.',
              },
              {
                n: '2',
                title: 'Paste the link',
                body: 'Drop your Notion page URL into NotoHub and choose a URL slug.',
              },
              {
                n: '3',
                title: 'Share it',
                body: 'Your article is live and shareable — no hosting, no extra config.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#1a8917] text-white flex items-center justify-center font-heading font-bold text-lg shrink-0">
                  {n}
                </div>
                <h3 className="font-heading font-semibold text-lg text-[#1a1a1a]">{title}</h3>
                <p className="text-[#6b6b6b] text-sm leading-relaxed max-w-xs mx-auto">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6e6e6] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-heading font-bold text-[#1a1a1a]">NotoHub</span>
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
