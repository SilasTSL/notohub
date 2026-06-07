export interface AuthUser {
  userId: string
  email: string
  username: string
}

export interface Article {
  slug: string
  title: string
  publishedAt: string
  notionPageId?: string
}
