// ─── Primitive helpers ──────────────────────────────────────────────────────

export type ISODateString = string; // e.g. "2024-01-15T12:00:00Z"

// ─── Domain models ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  notionUserId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

/** Full article with rendered HTML content (stored in S3). */
export interface Article {
  id: string;            // UUID generated at sync time
  notionPageId: string;  // Source Notion page ID
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  content: string;       // Rendered HTML (fetched from S3)
  tags: Tag[];
  author: Pick<User, "id" | "name" | "avatarUrl">;
  publishedAt: ISODateString;
  updatedAt: ISODateString;
  notionLastEditedAt: ISODateString;
}

/** Lightweight metadata stored in DynamoDB (no full content). */
export type ArticleMetadata = Omit<Article, "content">;

/** DynamoDB record shape (flat, ready for marshalling). */
export interface ArticleRecord {
  PK: string;              // "ARTICLE#<id>"
  SK: string;              // "ARTICLE"
  GSI1PK: string;          // "SLUG#<slug>"
  GSI1SK: string;          // "ARTICLE"
  id: string;
  notionPageId: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  s3Key: string;           // S3 object key for rendered HTML
  tagsJson: string;        // JSON.stringify(Tag[])
  authorJson: string;      // JSON.stringify(author)
  publishedAt: ISODateString;
  updatedAt: ISODateString;
  notionLastEditedAt: ISODateString;
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "running" | "succeeded" | "failed";

export interface SyncResult {
  status: SyncStatus;
  syncedAt: ISODateString;
  articlesProcessed: number;
  articlesUpdated: number;
  errors: string[];
}

// ─── API shapes ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export type ArticleListResponse = ApiResponse<PaginatedResponse<ArticleMetadata>>;
export type ArticleDetailResponse = ApiResponse<Article>;
export type SyncResponse = ApiResponse<SyncResult>;

// ─── Query params ───────────────────────────────────────────────────────────

export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  tag?: string;
  search?: string;
}
