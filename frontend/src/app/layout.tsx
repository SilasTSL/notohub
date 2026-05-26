import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Notohub",
    template: "%s | Notohub",
  },
  description: "A Notion-powered content hub.",
  openGraph: {
    type: "website",
    siteName: "Notohub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-200 dark:border-gray-800">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <a href="/" className="text-xl font-bold tracking-tight text-brand-600">
                Notohub
              </a>
              <nav className="flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
                <a href="/articles" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Articles
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </main>

          <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Notohub. Powered by Notion.
          </footer>
        </div>
      </body>
    </html>
  );
}
