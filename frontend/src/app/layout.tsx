import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
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
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-white text-[#1a1a1a]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
