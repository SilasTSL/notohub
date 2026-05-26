import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "./config.js";

// ─── Client singleton ────────────────────────────────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  _client ??= new S3Client({ region: config.awsRegion });
  return _client;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function articleS3Key(articleId: string): string {
  return `${config.s3ContentPrefix}${articleId}.html`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Store rendered HTML for an article. */
export async function putArticleHtml(
  articleId: string,
  html: string
): Promise<string> {
  const client = getClient();
  const key = articleS3Key(articleId);

  await client.send(
    new PutObjectCommand({
      Bucket: config.s3BucketName,
      Key: key,
      Body: html,
      ContentType: "text/html; charset=utf-8",
      CacheControl: "public, max-age=3600",
    })
  );

  return key;
}

/** Fetch rendered HTML for an article. Returns null if not found. */
export async function getArticleHtml(s3Key: string): Promise<string | null> {
  const client = getClient();

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: config.s3BucketName,
        Key: s3Key,
      })
    );

    if (!result.Body) return null;
    return await result.Body.transformToString("utf-8");
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name: string }).name === "NoSuchKey"
    ) {
      return null;
    }
    throw err;
  }
}
