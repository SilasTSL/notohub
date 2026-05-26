import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { config } from "./config.js";
import type { ArticleMetadata, Tag, User } from "@notohub/shared";
import { v4 as uuidv4 } from "uuid";

// ─── Singletons ─────────────────────────────────────────────────────────────

let _notion: Client | null = null;
let _n2m: NotionToMarkdown | null = null;

function getNotion(): Client {
  _notion ??= new Client({ auth: config.notionApiKey });
  return _notion;
}

function getN2M(): NotionToMarkdown {
  if (!_n2m) {
    _n2m = new NotionToMarkdown({ notionClient: getNotion() });
  }
  return _n2m;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRichTextValue(
  page: PageObjectResponse,
  prop: string
): string {
  const p = page.properties[prop];
  if (!p || p.type !== "rich_text") return "";
  return p.rich_text.map((t) => t.plain_text).join("");
}

function getTitleValue(page: PageObjectResponse): string {
  for (const p of Object.values(page.properties)) {
    if (p.type === "title") return p.title.map((t) => t.plain_text).join("");
  }
  return "";
}

function getMultiSelectTags(page: PageObjectResponse, prop: string): Tag[] {
  const p = page.properties[prop];
  if (!p || p.type !== "multi_select") return [];
  return p.multi_select.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.name.toLowerCase().replace(/\s+/g, "-"),
    color: t.color,
  }));
}

function getDateValue(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop];
  if (!p || p.type !== "date") return null;
  return p.date?.start ?? null;
}

function getPersonValue(
  page: PageObjectResponse,
  prop: string
): Pick<User, "id" | "name" | "avatarUrl"> {
  const p = page.properties[prop];
  if (!p || p.type !== "people" || p.people.length === 0) {
    return { id: "unknown", name: "Unknown Author" };
  }
  const person = p.people[0]!;
  return {
    id: person.id,
    name: "name" in person ? (person.name ?? "Unknown") : "Unknown",
    avatarUrl:
      "avatar_url" in person ? (person.avatar_url ?? undefined) : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Fetch all published pages from the Notion database. */
export async function fetchNotionPages(): Promise<PageObjectResponse[]> {
  const notion = getNotion();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: config.notionDatabaseId,
      filter: {
        property: "Status",
        select: { equals: "Published" },
      },
      sorts: [{ property: "Published Date", direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      if (result.object === "page" && "properties" in result) {
        pages.push(result as PageObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

/** Convert a Notion page to ArticleMetadata (no content). */
export function pageToMetadata(
  page: PageObjectResponse,
  s3Key: string,
  existingId?: string
): ArticleMetadata {
  const title = getTitleValue(page);
  const slug =
    getRichTextValue(page, "Slug") ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const publishedAt =
    getDateValue(page, "Published Date") ?? page.created_time;

  return {
    id: existingId ?? uuidv4(),
    notionPageId: page.id,
    title,
    slug,
    excerpt: getRichTextValue(page, "Excerpt"),
    coverImageUrl:
      page.cover?.type === "external"
        ? page.cover.external.url
        : page.cover?.type === "file"
          ? page.cover.file.url
          : undefined,
    tags: getMultiSelectTags(page, "Tags"),
    author: getPersonValue(page, "Author"),
    publishedAt,
    updatedAt: page.last_edited_time,
    notionLastEditedAt: page.last_edited_time,
  };
}

/** Convert a Notion page body to a Markdown string. */
export async function pageToMarkdown(pageId: string): Promise<string> {
  const n2m = getN2M();
  const blocks = await n2m.pageToMarkdown(pageId);
  return n2m.toMarkdownString(blocks).parent;
}
