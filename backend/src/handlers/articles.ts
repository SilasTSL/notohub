/**
 * Lambda handler: GET /articles          → list article metadata
 *                 GET /articles/{slug}   → article detail (metadata + HTML content)
 */
import type { APIGatewayProxyHandler } from "aws-lambda";
import { listArticles, getArticleBySlug } from "../lib/dynamodb.js";
import { getArticleHtml } from "../lib/s3.js";
import { ok, notFound, serverError, noContent } from "../lib/response.js";
import type {
  PaginatedResponse,
  ArticleMetadata,
  Article,
  ArticleListParams,
} from "@notohub/shared";

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") return noContent();

  const slug = event.pathParameters?.["slug"];

  try {
    // ── GET /articles/{slug} ─────────────────────────────────────────────────
    if (slug) {
      const record = await getArticleBySlug(slug);
      if (!record) return notFound(`Article "${slug}" not found`);

      const html = await getArticleHtml(record.s3Key);
      if (!html) return notFound("Article content not available");

      const article: Article = {
        id: record.id,
        notionPageId: record.notionPageId,
        title: record.title,
        slug: record.slug,
        excerpt: record.excerpt,
        coverImageUrl: record.coverImageUrl,
        content: html,
        tags: JSON.parse(record.tagsJson),
        author: JSON.parse(record.authorJson),
        publishedAt: record.publishedAt,
        updatedAt: record.updatedAt,
        notionLastEditedAt: record.notionLastEditedAt,
      };

      return ok<Article>(article);
    }

    // ── GET /articles ────────────────────────────────────────────────────────
    const qs = event.queryStringParameters ?? {};
    const params: ArticleListParams = {
      page: Number(qs["page"] ?? 1),
      pageSize: Math.min(Number(qs["pageSize"] ?? 20), 100),
    };

    const { items } = await listArticles({ limit: params.pageSize });

    // Simple in-memory tag filter
    const filtered = qs["tag"]
      ? items.filter((a: ArticleMetadata) =>
          a.tags.some((t) =>
            t.slug === qs["tag"] || t.name === qs["tag"]
          )
        )
      : items;

    const paginated: PaginatedResponse<ArticleMetadata> = {
      items: filtered,
      total: filtered.length,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      hasNextPage: false,
    };

    return ok(paginated);
  } catch (err) {
    return serverError(err);
  }
};
