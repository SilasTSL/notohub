const FEATURES = [
  {
    title: 'Publish in one click',
    body: "Paste a Notion page link, pick a slug, hit publish. That's the whole workflow — no drag-and-drop editor to fight with.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    title: 'Stay in Notion',
    body: 'Keep writing exactly where you already do. Made an edit? Hit re-publish from your dashboard and the latest version goes live.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
  },
  {
    title: 'A real home for your writing',
    body: 'Every writer gets a public profile — bio, avatar, social links, and every article you\'ve published, all in one place.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
  },
  {
    title: 'Zero hosting, zero config',
    body: 'No servers to manage, no build pipelines, no DNS records to figure out. We handle the infrastructure so you can focus on writing.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-14 5h.01M9 17h.01" />
    ),
  },
  {
    title: 'Built-in discovery',
    body: 'Every article ends with "More from this author," so readers who like your writing naturally find the rest of it.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
  },
]

export default function Features() {
  return (
    <section className="border-t border-[#e6e6e6] bg-[#f9f9f9] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl font-bold text-[#1a1a1a] tracking-tight">
            You write. We handle the rest.
          </h2>
          <p className="mt-3 text-[#6b6b6b] text-lg">
            No themes to pick, no plugins to configure, nothing to deploy.
            NotoHub does one thing — turn a Notion page into a real blog — so
            you never have to think like a developer.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {FEATURES.map(({ title, body, icon }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-[#e6e6e6] p-6 flex flex-col gap-3 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            >
              <div className="w-10 h-10 rounded-lg bg-[#f0faf0] flex items-center justify-center text-[#1a8917] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {icon}
                </svg>
              </div>
              <h3 className="font-heading font-semibold text-[#1a1a1a] text-base">{title}</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
