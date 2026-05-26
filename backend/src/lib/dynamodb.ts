import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { ArticleRecord, ArticleMetadata, Tag } from "@notohub/shared";
import { config } from "./config.js";

// ─── Client singleton ────────────────────────────────────────────────────────

let _client: DynamoDBClient | null = null;

function getClient(): DynamoDBClient {
  _client ??= new DynamoDBClient({ region: config.awsRegion });
  return _client;
}

// ─── Conversions ─────────────────────────────────────────────────────────────

function recordToMetadata(record: ArticleRecord): ArticleMetadata {
  return {
    id: record.id,
    notionPageId: record.notionPageId,
    title: record.title,
    slug: record.slug,
    excerpt: record.excerpt,
    coverImageUrl: record.coverImageUrl,
    tags: JSON.parse(record.tagsJson) as Tag[],
    author: JSON.parse(record.authorJson) as ArticleMetadata["author"],
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    notionLastEditedAt: record.notionLastEditedAt,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Upsert an article record. */
export async function putArticle(record: ArticleRecord): Promise<void> {
  const client = getClient();
  await client.send(
    new PutItemCommand({
      TableName: config.dynamoTableName,
      Item: marshall(record, { removeUndefinedValues: true }),
    })
  );
}

/** Get article metadata by slug (uses GSI1). */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleRecord | null> {
  const client = getClient();
  const result = await client.send(
    new QueryCommand({
      TableName: config.dynamoTableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: marshall({
        ":pk": `SLUG#${slug}`,
        ":sk": "ARTICLE",
      }),
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) return null;
  return unmarshall(result.Items[0]!) as ArticleRecord;
}

/** Get article metadata by Notion page ID (primary key lookup). */
export async function getArticleByNotionId(
  notionPageId: string
): Promise<ArticleRecord | null> {
  const client = getClient();
  const result = await client.send(
    new QueryCommand({
      TableName: config.dynamoTableName,
      IndexName: "NotionPageIndex",
      KeyConditionExpression: "notionPageId = :nid",
      ExpressionAttributeValues: marshall({ ":nid": notionPageId }),
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) return null;
  return unmarshall(result.Items[0]!) as ArticleRecord;
}

/** List all article metadata (paginated scan). */
export async function listArticles(opts?: {
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}): Promise<{ items: ArticleMetadata[]; lastKey?: Record<string, unknown> }> {
  const client = getClient();
  const result = await client.send(
    new ScanCommand({
      TableName: config.dynamoTableName,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: marshall({ ":sk": "ARTICLE" }),
      Limit: opts?.limit ?? 50,
      ExclusiveStartKey: opts?.exclusiveStartKey
        ? marshall(opts.exclusiveStartKey)
        : undefined,
    })
  );

  const items = (result.Items ?? []).map((item) =>
    recordToMetadata(unmarshall(item) as ArticleRecord)
  );

  // Sort by publishedAt descending (scan order is not guaranteed)
  items.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return {
    items,
    lastKey: result.LastEvaluatedKey
      ? (unmarshall(result.LastEvaluatedKey) as Record<string, unknown>)
      : undefined,
  };
}
