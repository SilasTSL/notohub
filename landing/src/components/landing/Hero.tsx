import Link from 'next/link'

const APP_URL = 'https://app.notohub.com'

export default function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#1a8917] bg-[#f0faf0] border border-[#b8ddb8] rounded-full px-3 py-1 mb-6">
        For writers, not developers
      </span>

      <h1 className="font-heading text-5xl sm:text-6xl font-bold text-[#1a1a1a] tracking-tight leading-[1.08]">
        Start a blog without
        <br />
        touching a line of code.
      </h1>

      <p className="mt-6 text-xl text-[#6b6b6b] max-w-2xl mx-auto leading-relaxed">
        You want to write, not fight a site builder. Write in Notion exactly like
        you already do — NotoHub turns any page into a real, good-looking blog
        with its own URL. No design decisions, no hosting to figure out.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={`${APP_URL}/signup`}
          className="bg-[#1a8917] hover:bg-[#157313] text-white px-8 py-3.5 rounded-lg font-medium transition-colors text-base"
        >
          Start publishing — it&apos;s free
        </a>
        <Link
          href="/articles"
          className="border border-[#e6e6e6] hover:border-[#1a8917] text-[#1a1a1a] px-8 py-3.5 rounded-lg font-medium transition-colors text-base"
        >
          Browse articles
        </Link>
      </div>

      <p className="mt-4 text-xs text-[#b0b0b0]">
        No credit card. No code. Just write.
      </p>

      <div className="mt-14 max-w-4xl mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/index-example.png"
          alt="A NotoHub author profile page, with published articles"
          className="w-full h-auto rounded-xl border border-[#e6e6e6] shadow-sm"
        />
      </div>
    </section>
  )
}
