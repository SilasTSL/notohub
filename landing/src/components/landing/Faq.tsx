'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Do I need to make my Notion page public?',
    a: 'No. You just share the page with the NotoHub integration in Notion — nobody else needs access to your workspace.',
  },
  {
    q: "What happens if I edit the page in Notion after publishing?",
    a: 'Your live article won\'t change automatically. Hit "Re-publish" from your dashboard whenever you want, and NotoHub re-syncs the latest version from Notion.',
  },
  {
    q: 'Is it actually free?',
    a: 'Yes — free for everyone right now. No credit card, no trial countdown, no catch.',
  },
  {
    q: 'Do my readers need a Notion account to read my articles?',
    a: 'Nope. Published articles are plain, fast web pages anyone can read — no Notion login, no NotoHub account required to read.',
  },
  {
    q: 'Can I use my own domain?',
    a: "Not yet — every writer gets a clean notohub.com/you URL today. Custom domains aren't available at the moment.",
  },
  {
    q: 'Can I take an article down after publishing it?',
    a: "Yes, you can delete any of your published articles from your dashboard at any time.",
  },
]

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="border-t border-[#e6e6e6] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-center text-[#1a1a1a] mb-12">
          Frequently asked questions
        </h2>

        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => {
            const open = openIndex === i
            return (
              <div
                key={q}
                className="border border-[#e6e6e6] rounded-xl overflow-hidden bg-white"
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-[#f9f9f9] transition-colors"
                  aria-expanded={open}
                >
                  <span className="font-medium text-[#1a1a1a] text-sm sm:text-base">{q}</span>
                  <svg
                    className={`w-5 h-5 shrink-0 text-[#6b6b6b] transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm text-[#6b6b6b] leading-relaxed">{a}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
