const STEPS = [
  {
    n: '1',
    title: 'Write in Notion',
    body: 'Create your article as a Notion page, exactly like you already do. No new editor, no learning curve.',
  },
  {
    n: '2',
    title: 'Paste the link',
    body: 'Drop your Notion page URL into NotoHub and choose a URL slug. Add a cover image if you want.',
  },
  {
    n: '3',
    title: 'Share it',
    body: 'Your article is live at notohub.com/you/your-slug — shareable instantly, no hosting or deployment involved.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-center text-[#1a1a1a] mb-14">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-10 text-center mb-16">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="flex flex-col items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-[#1a8917] text-white flex items-center justify-center font-heading font-bold text-lg shrink-0">
                {n}
              </div>
              <h3 className="font-heading font-semibold text-lg text-[#1a1a1a]">{title}</h3>
              <p className="text-[#6b6b6b] text-sm leading-relaxed max-w-xs mx-auto">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="aspect-[4/3] rounded-xl border border-[#e6e6e6] shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/notion-link-modal.png"
              alt="Publish modal — paste a Notion link, pick a slug"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="aspect-[4/3] rounded-xl border border-[#e6e6e6] shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/published-article.png"
              alt="A published article on NotoHub"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
