/** Centralised env-var access with fail-fast validation. */

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  notionApiKey: required("NOTION_API_KEY"),
  notionDatabaseId: required("NOTION_DATABASE_ID"),
  dynamoTableName: required("DYNAMODB_TABLE_NAME"),
  s3BucketName: required("S3_BUCKET_NAME"),
  s3ContentPrefix: process.env["S3_CONTENT_PREFIX"] ?? "articles/",
  awsRegion: process.env["AWS_REGION"] ?? "ap-southeast-1",
  allowedOrigin: process.env["ALLOWED_ORIGIN"] ?? "*",
} as const;
