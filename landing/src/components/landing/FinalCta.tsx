const APP_URL = 'https://app.notohub.com'

export default function FinalCta() {
  return (
    <section className="border-t border-[#e6e6e6] bg-[#f9f9f9] py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1a1a1a] tracking-tight">
          Ready to publish your first article?
        </h2>
        <p className="mt-4 text-lg text-[#6b6b6b]">
          It takes less time than writing the Notion page did.
        </p>
        <div className="mt-8">
          <a
            href={`${APP_URL}/signup`}
            className="inline-block bg-[#1a8917] hover:bg-[#157313] text-white px-8 py-3.5 rounded-lg font-medium transition-colors text-base"
          >
            Start publishing — it&apos;s free
          </a>
        </div>
        <p className="mt-4 text-xs text-[#b0b0b0]">
          No credit card. No hosting to manage. Just write.
        </p>
      </div>
    </section>
  )
}
