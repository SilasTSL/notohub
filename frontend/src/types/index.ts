export interface AuthUser {
  userId: string
  email: string
  username: string
}

export interface Article {
  id: string
  slug: string
  title: string
  publishedAt: string
  excerpt?: string
  notionPageId?: string
}
