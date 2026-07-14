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
  coverImageUrl?: string | null
  notionPageId?: string
  notionLink?: string
}

export interface UserProfile {
  name?: string
  location?: string
  bio?: string
  avatarUrl?: string
  socialLinks?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  profilePublished: boolean
  notionConnected: boolean
}
