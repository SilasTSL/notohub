# Notohub Backend

Python Lambda backend for Notohub. Converts Notion pages to styled HTML and hosts them on S3.

## Running locally

```bash
cp .env.example .env        # fill in your values
pip install -r requirements.txt
python run_local.py         # starts on http://localhost:8000
```

---

## Routes

### `POST /v1/article`

Register a new article by saving its title and Notion page link. Nothing is fetched from Notion yet — the article is created as a **draft**.

**Request body**
```json
{
  "title": "My Article Title",
  "notion_link": "https://www.notion.so/My-Article-Title-abc123..."
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Article Title",
    "notionLink": "https://www.notion.so/...",
    "status": "draft",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### `POST /v1/article/{articleId}/publish`

Publish a draft article. Fetches the Notion page, converts it to styled HTML, uploads it to S3, and marks the article as **published**.

Can be called again on an already-published article to re-sync changes from Notion.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Article Title",
    "authorName": "John Doe",
    "url": "https://www.notohub.com/john-doe/my-article-title/",
    "status": "published",
    "publishedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### `GET /articles`

List all published articles (metadata only, no HTML content).

**Query params**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Results per page, max 100 (default: 20) |
| `tag` | string | Filter by tag name or slug |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [{ "id": "...", "title": "...", "slug": "...", "author": {}, "tags": [], "publishedAt": "..." }],
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "hasNextPage": false
  }
}
```

---

### `GET /articles/{slug}`

Fetch a single published article including its full rendered HTML content.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Article Title",
    "slug": "my-article-title",
    "content": "<html>...</html>",
    "author": { "id": "...", "name": "John Doe" },
    "tags": [{ "id": "...", "name": "Engineering", "slug": "engineering" }],
    "publishedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Response `404`** if no article with that slug exists.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NOTION_API_KEY` | Yes | Notion integration token (`secret_...`) |
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name |
| `S3_BUCKET_NAME` | Yes | S3 bucket for hosting article HTML |
| `AWS_REGION` | Yes | AWS region (e.g. `ap-southeast-1`) |
| `AWS_ACCESS_KEY_ID` | Local only | AWS credentials (not needed on Lambda) |
| `AWS_SECRET_ACCESS_KEY` | Local only | AWS credentials (not needed on Lambda) |
| `ALLOWED_ORIGIN` | No | CORS origin (default: `*`) |
