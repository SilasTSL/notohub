import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NotoHub',
    template: '%s | NotoHub',
  },
  description: 'Publish your Notion articles to the world.',
  openGraph: {
    type: 'website',
    siteName: 'NotoHub',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-white text-[#1a1a1a]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
