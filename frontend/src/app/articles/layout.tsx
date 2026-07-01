import type { ReactNode } from 'react'
import PublicLayout from '@/components/PublicLayout'

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
