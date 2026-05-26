/**
 * Lambda handler: POST /sync
 *
 * Fetches all published pages from Notion, converts them to HTML,
 * stores HTML in S3, and upserts metadata in DynamoDB.
 */
import type { APIGatewayProxyHandler } from "aws-lambda";
import { marked } from "marked";
import {
  fetchNotionPages,
  pageToMarkdown,
  pageToMetadata,
} from "../lib/notion.js";
import {
  putArticle,
  getArticleByNotionId,
} from "../lib/dynamodb.js";
import { putArticleHtml } from "../lib/s3.js";
import { ok, serverError, noContent } from "../lib/response.js";
import type { ArticleRecord, SyncResult } from "@notohub/shared";

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();

  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  try {
    const pages = await fetchNotionPages();
    processed = pages.length;

    for (const page of pages) {
      try {
        // Check if this article already exists
        const existing = await getArticleByNotionId(page.id);
        const existingId = existing?.id;

        // Skip if Notion hasn't changed since last sync
        if (
          existing &&
          existing.notionLastEditedAt === page.last_edited_time
        ) {
          continue;
        }

        // Convert Notion page body → Markdown → HTML
        const markdown = await pageToMarkdown(page.id);
        const html = await marked.parse(markdown);

        // Build metadata (may reuse existing id)
        const metadata = pageToMetadata(page, "", existingId);

        // Store HTML in S3
        const s3Key = await putArticleHtml(metadata.id, html);

        // Build DynamoDB record
        const record: ArticleRecord = {
          PK: `ARTICLE#${metadata.id}`,
          SK: "ARTICLE",
          GSI1PK: `SLUG#${metadata.slug}`,
          GSI1SK: "ARTICLE",
          id: metadata.id,
          notionPageId: page.id,
          title: metadata.title,
          slug: metadata.slug,
          excerpt: metadata.excerpt,
          coverImageUrl: metadata.coverImageUrl,
          s3Key,
          tagsJson: JSON.stringify(metadata.tags),
          authorJson: JSON.stringify(metadata.author),
          publishedAt: metadata.publishedAt,
          updatedAt: new Date().toISOString(),
          notionLastEditedAt: page.last_edited_time,
        };

        await putArticle(record);
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Page ${page.id}: ${msg}`);
        console.error(`[SYNC] Error processing page ${page.id}:`, err);
      }
    }

    const result: SyncResult = {
      status: errors.length === 0 ? "succeeded" : "failed",
      syncedAt,
      articlesProcessed: processed,
      articlesUpdated: updated,
      errors,
    };

    return ok(result);
  } catch (err) {
    return serverError(err);
  }
};
