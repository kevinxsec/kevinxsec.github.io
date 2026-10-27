export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated: string | null;
  description: string;
  category: string;
  platform: string | null;
  difficulty: string | null;
  tags: string[];
  featured: boolean;
  cover: string | null;
  readingTime: number;
}
export interface RawPost extends Omit<PostMeta, "readingTime"> {
  file: string;
  published: boolean;
  body: string;
}
export const SITE: {
  url: string;
  title: string;
  description: string;
  author: string;
  [key: string]: unknown;
};
export const PLATFORMS: string[];
export const CATEGORIES: Record<string, string>;
export const DIFFICULTIES: string[];
export const STATIC_PATHS: string[];
export const PAGE_SIZE: number;
export class ContentError extends Error {}
export function slugify(value: string): string;
export function validateFrontmatter(data: Record<string, unknown>, file?: string): string[];
export function readingTime(text: string): number;
export function renderMarkdown(markdown: string): Promise<{
  html: string;
  toc: { depth: number; id: string; text: string }[];
}>;
export function loadPosts(contentDir: string, publicDir?: string): RawPost[];
export function sitePaths(posts: { slug: string; tags: string[]; category: string }[]): string[];
export function buildContent(root?: string, opts?: { log?: boolean }): Promise<RawPost[]>;
export interface ImageRef {
  kind: "markdown" | "html" | "wikilink" | "reference";
  url: string | null;
  start: number;
  end: number;
  raw: string;
  alt?: string;
  title?: string | null;
}
export function maskCode(text: string): string;
export function findImageRefs(markdown: string): ImageRef[];
export function resolveExactCase(baseDir: string, relPath: string): { ok: boolean; reason?: "missing" | "case"; expected?: string };
export function checkImageUrl(url: string, baseDir: string, label?: string): string | null;
export function checkMarkdownImages(markdown: string, publicDir: string, rel?: string): string[];
export function checkHtmlImages(html: string, outDir: string): string[];
