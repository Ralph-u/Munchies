import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { YoutubeTranscript } from 'youtube-transcript';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

interface Recipe {
  id: string;
  title: string;
  source_url: string;
  source_platform: 'youtube' | 'instagram' | 'other';
  author?: string;
  thumbnail_url?: string;
  ingredients: string[];
  steps: string[];
  created_at: string;
  confidence?: 'low';
}

function detectPlatform(url: string): Recipe['source_platform'] {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const MOCK_EXTRACT = process.env.MOCK_EXTRACT !== 'false';

const MOCK_CARBONARA: Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'> = {
  title: 'Spaghetti Carbonara',
  ingredients: [
    '200g spaghetti',
    '100g pancetta or guanciale, diced',
    '2 large eggs + 1 yolk',
    '50g Pecorino Romano, finely grated',
    '30g Parmesan, finely grated',
    'Freshly cracked black pepper',
    'Salt (for pasta water)',
  ],
  steps: [
    'Bring a large pot of salted water to a boil. Cook spaghetti until al dente, reserving 1 cup of pasta water before draining.',
    'Meanwhile, cook pancetta in a cold skillet over medium heat until the fat renders and the edges are crispy, about 6–8 minutes. Remove from heat.',
    'Whisk eggs, yolk, Pecorino, and Parmesan together in a bowl. Season generously with black pepper.',
    'Add hot drained pasta to the skillet with the pancetta (off the heat). Toss to coat in the fat.',
    'Pour the egg mixture over the pasta. Toss constantly, adding pasta water a splash at a time, until the sauce is creamy and clings to each strand.',
    'Serve immediately topped with extra cheese and black pepper.',
  ],
};

// ─── Page metadata ────────────────────────────────────────────────────────────

interface PageMeta {
  title: string;
  description: string;
  thumbnailUrl: string;
}

// Extract a meta tag content regardless of attribute order or quote style
function metaContent(html: string, attrType: string, attrValue: string): string {
  const q = `["']`;
  const any = `[^>]*?`;
  const content = `([^"']+)`;
  // property/name/itemprop="VALUE" ... content="URL"  or reversed
  const re1 = new RegExp(`<meta${any}${attrType}=${q}${attrValue}${q}${any}content=${q}${content}${q}`, 'i');
  const re2 = new RegExp(`<meta${any}content=${q}${content}${q}${any}${attrType}=${q}${attrValue}${q}`, 'i');
  return html.match(re1)?.[1]?.trim() || html.match(re2)?.[1]?.trim() || '';
}

// Extract image from JSON-LD Recipe schema (most reliable on dedicated recipe sites)
function jsonLdImage(html: string): string {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const nodes: unknown[] = Array.isArray(data) ? data : (data?.['@graph'] ? data['@graph'] : [data]);
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const n = node as Record<string, unknown>;
        const type = n['@type'];
        const isRecipe = type === 'Recipe' || (Array.isArray(type) && (type as string[]).includes('Recipe'));
        if (!isRecipe) continue;
        const img = n['image'];
        if (typeof img === 'string') return img;
        if (Array.isArray(img) && img.length > 0) {
          const first = img[0];
          return typeof first === 'string' ? first : (first as Record<string, string>)['url'] ?? '';
        }
        if (img && typeof img === 'object') return (img as Record<string, string>)['url'] ?? '';
      }
    } catch { /* malformed JSON-LD */ }
  }
  return '';
}

function toAbsoluteUrl(src: string, base: string): string {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  try { return new URL(src, base).href; } catch { return src; }
}

async function fetchPageMeta(url: string): Promise<PageMeta> {
  // YouTube blocks server-side scrapers — use oEmbed for reliable title + thumbnail
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (oembedRes.ok) {
        const data = await oembedRes.json() as { title?: string; author_name?: string };
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&?/\s]+)/);
        const thumbnailUrl = videoIdMatch
          ? `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`
          : '';
        return {
          title: data.title ?? '',
          description: data.author_name ? `Cooking video by ${data.author_name}` : '',
          thumbnailUrl,
        };
      }
    } catch { /* fall through to scraping */ }
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });
  const html = await res.text();

  const title =
    metaContent(html, 'property', 'og:title') ||
    metaContent(html, 'name', 'twitter:title') ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? '');

  const description =
    metaContent(html, 'property', 'og:description') ||
    metaContent(html, 'name', 'twitter:description') ||
    metaContent(html, 'name', 'description');

  const rawThumb =
    metaContent(html, 'property', 'og:image') ||
    metaContent(html, 'property', 'og:image:secure_url') ||
    metaContent(html, 'name', 'twitter:image') ||
    metaContent(html, 'name', 'twitter:image:src') ||
    metaContent(html, 'itemprop', 'image') ||
    jsonLdImage(html);

  return { title, description, thumbnailUrl: toAbsoluteUrl(rawThumb, url) };
}

// ─── Author detection ─────────────────────────────────────────────────────────

async function fetchAuthor(url: string): Promise<string | undefined> {
  // YouTube: oembed gives the channel name reliably
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) {
        const data = await res.json() as { author_name?: string };
        return data.author_name || undefined;
      }
    } catch { /* ignore */ }
    return undefined;
  }

  // Instagram: extract username from URL path
  if (url.includes('instagram.com')) {
    const match = url.match(/instagram\.com\/([^/?#]+)/);
    const segment = match?.[1];
    const reserved = ['p', 'reel', 'reels', 'stories', 'explore', 'tv'];
    if (segment && !reserved.includes(segment)) return `@${segment}`;
    return undefined;
  }

  // Websites: try og:site_name then <meta name="author">
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    return (
      metaContent(html, 'property', 'og:site_name') ||
      metaContent(html, 'name', 'author') ||
      undefined
    );
  } catch {
    return undefined;
  }
}

// ─── Image download ───────────────────────────────────────────────────────────

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

type ContentBlock =
  | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
  | { type: 'text'; text: string };

function toImageMediaType(contentType: string): ImageMediaType {
  if (contentType.includes('png')) return 'image/png';
  if (contentType.includes('webp')) return 'image/webp';
  if (contentType.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}

async function fetchImageBase64(url: string): Promise<{ data: string; mediaType: ImageMediaType }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
  const buffer = await res.arrayBuffer();
  return {
    data: Buffer.from(buffer).toString('base64'),
    mediaType: toImageMediaType(contentType),
  };
}

// ─── Instagram extraction ─────────────────────────────────────────────────────

interface InstagramContext {
  caption: string;
  thumbnailUrl: string;
  topComments: string[];
}

function extractInstagramShortcode(url: string): string | null {
  return url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

const IG_UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const IG_UA_MOBILE  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Walk an arbitrary JS object collecting all string values keyed "text"
function walkForText(obj: unknown, results: string[], maxItems: number, maxDepth: number, depth = 0): void {
  if (depth > maxDepth || results.length >= maxItems || !obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(v => walkForText(v, results, maxItems, maxDepth, depth + 1)); return; }
  const o = obj as Record<string, unknown>;
  if (typeof o['text'] === 'string' && (o['text'] as string).length > 10) results.push(o['text'] as string);
  Object.values(o).forEach(v => walkForText(v, results, maxItems, maxDepth, depth + 1));
}

// Find the caption node specifically (Instagram marks it with is_caption: true)
function findCaptionInJson(obj: unknown, depth = 0): string {
  if (depth > 20 || !obj || typeof obj !== 'object') return '';
  if (Array.isArray(obj)) {
    for (const v of obj) { const r = findCaptionInJson(v, depth + 1); if (r) return r; }
    return '';
  }
  const o = obj as Record<string, unknown>;
  if (o['is_caption'] === true && typeof o['text'] === 'string') return o['text'] as string;
  for (const v of Object.values(o)) { const r = findCaptionInJson(v, depth + 1); if (r) return r; }
  return '';
}

// Parse all <script> tags in the page looking for caption and comment text
function extractFromPageScripts(html: string): { caption: string; comments: string[] } {
  let caption = '';
  const comments: string[] = [];

  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { continue; }

    // Look for explicit caption node first
    const c = findCaptionInJson(parsed);
    if (c && c.length > caption.length) caption = c;

    // Collect all text nodes as potential comments
    const texts: string[] = [];
    walkForText(parsed, texts, 20, 15);
    for (const t of texts) {
      if (t !== caption && !comments.includes(t)) comments.push(t);
    }
  }

  return { caption, comments: [...new Set(comments)].slice(0, 8) };
}

// Scrape the post page directly — most reliable source for the full caption
async function scrapeInstagramPost(url: string): Promise<{ caption: string; thumbnailUrl: string; pageComments: string[] }> {
  for (const ua of [IG_UA_MOBILE, IG_UA_DESKTOP]) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();

      // og:description is formatted like: "N likes, M comments - @user on date: "caption""
      // or simply "username: caption text"
      let caption = metaContent(html, 'property', 'og:description') || '';
      // Strip the leading metadata prefix — everything after the first ": " that has substantial text
      const capMatch = caption.match(/[^:]+:\s*(.{15,})$/s);
      if (capMatch) caption = capMatch[1].replace(/^["'"]|["'"]\s*$/g, '').trim();

      const thumbnailUrl = metaContent(html, 'property', 'og:image') || '';

      // Try to get a more complete caption and comments from embedded JSON
      const { caption: jsonCaption, comments: pageComments } = extractFromPageScripts(html);
      if (jsonCaption && jsonCaption.length > caption.length) caption = jsonCaption;

      if (caption.length > 15 || thumbnailUrl) {
        return { caption, thumbnailUrl, pageComments };
      }
    } catch { /* try next user-agent */ }
  }
  return { caption: '', thumbnailUrl: '', pageComments: [] };
}

// Try the embed page for comments not surfaced in the post page JSON
async function scrapeInstagramEmbedComments(shortcode: string): Promise<string[]> {
  for (const path of [`/p/${shortcode}/embed/captioned/`, `/p/${shortcode}/embed/`]) {
    try {
      const res = await fetch(`https://www.instagram.com${path}`, {
        headers: { 'User-Agent': IG_UA_DESKTOP, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.5' },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const comments: string[] = [];

      for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
        try { walkForText(JSON.parse(m[1].trim()), comments, 10, 15); } catch {}
        if (comments.length >= 10) break;
      }
      if (comments.length > 0) return [...new Set(comments)].slice(0, 5);

      // Span fallback for older embed HTML
      for (const m of html.matchAll(/<span[^>]*>([^<]{15,600})<\/span>/g)) {
        const t = m[1].trim();
        if (t && !comments.includes(t)) { comments.push(t); if (comments.length >= 5) break; }
      }
      if (comments.length > 0) return comments;
    } catch { /* try next path */ }
  }
  return [];
}

async function fetchInstagramContext(url: string): Promise<InstagramContext> {
  const shortcode = extractInstagramShortcode(url);

  // All three sources run in parallel
  const [pageResult, oembedResult, embedComments] = await Promise.allSettled([
    scrapeInstagramPost(url),
    fetch(`https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': IG_UA_DESKTOP, 'Accept': 'application/json' },
    }),
    shortcode ? scrapeInstagramEmbedComments(shortcode) : Promise.resolve([]),
  ]);

  let caption = '';
  let thumbnailUrl = '';
  let topComments: string[] = [];

  // Page scrape is primary
  if (pageResult.status === 'fulfilled') {
    caption = pageResult.value.caption;
    thumbnailUrl = pageResult.value.thumbnailUrl;
    topComments = pageResult.value.pageComments;
  }

  // oEmbed fills gaps
  if ((!caption || !thumbnailUrl) && oembedResult.status === 'fulfilled' && oembedResult.value.ok) {
    const data = await oembedResult.value.json() as { title?: string; thumbnail_url?: string };
    if (!caption && data.title) caption = data.title;
    if (!thumbnailUrl && data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
  }

  // Embed page fills in comments if we didn't get any from the post page
  if (topComments.length === 0 && embedComments.status === 'fulfilled') {
    topComments = embedComments.value;
  }

  return { caption, thumbnailUrl, topComments };
}

async function extractFromInstagram(
  url: string,
  client: Anthropic,
): Promise<Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'>> {
  const ctx = await fetchInstagramContext(url);
  const contentBlocks: ContentBlock[] = [];

  if (ctx.thumbnailUrl) {
    try {
      const { data, mediaType } = await fetchImageBase64(ctx.thumbnailUrl);
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    } catch { /* thumbnail download failed — proceed with text only */ }
  }

  const textParts: string[] = [];
  if (ctx.caption) {
    textParts.push(`Instagram post caption (may contain the full recipe):\n${ctx.caption}`);
  }
  if (ctx.topComments.length > 0) {
    textParts.push(`Post comments (check for pinned/top comment with recipe):\n${ctx.topComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
  }
  if (!ctx.caption && !ctx.thumbnailUrl) {
    textParts.push(`Instagram URL: ${url}\nNo caption or thumbnail could be retrieved — infer what you can.`);
  } else if (ctx.thumbnailUrl && !ctx.caption) {
    textParts.push('No caption available. Extract whatever recipe information is visible in the image.');
  }
  contentBlocks.push({ type: 'text', text: textParts.join('\n\n') });

  async function callClaude(blocks: ContentBlock[]) {
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: blocks }],
    });
    return msg.content.find((b) => b.type === 'text')?.text ?? '';
  }

  let raw: string;
  try {
    raw = await callClaude(contentBlocks);
  } catch (err) {
    // Claude rejected the image (e.g. CDN served a non-image) — retry with text only
    const textOnly = contentBlocks.filter((b) => b.type === 'text');
    if (textOnly.length === contentBlocks.length) throw err; // no image was in the request anyway
    console.log('Image rejected by Claude, retrying text-only:', err instanceof Error ? err.message : err);
    raw = await callClaude(textOnly);
  }

  const parsed = parseClaudeJson(raw);
  if ('error' in parsed) {
    return { title: 'Unknown Recipe', ingredients: [], steps: [], confidence: 'low' };
  }
  return parsed as Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'>;
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseClaudeJson(raw: string): Record<string, unknown> {
  const jsonText = raw.replace(/^```(?:json)?\n?/m, '').replace(/```$/m, '').trim();
  return JSON.parse(jsonText);
}

// ─── Extraction ──────────────────────────────────────────────────────────────

async function extractRecipe(url: string): Promise<Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'>> {
  if (MOCK_EXTRACT) {
    await new Promise((r) => setTimeout(r, 1500));
    return MOCK_CARBONARA;
  }

  // Strip anything after whitespace in case the env var was saved with extra content
  const apiKey = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').split(/\s/)[0];
  const client = new Anthropic({ apiKey });

  // ── Instagram path ────────────────────────────────────────────────────────
  if (detectPlatform(url) === 'instagram') {
    return extractFromInstagram(url, client);
  }

  // ── Primary path: transcript + page metadata ──────────────────────────────
  let transcript = '';
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
    transcript = segments.map((s) => s.text).join(' ');
    console.log(`Transcript fetched: ${transcript.length} chars`);
  } catch (e) {
    console.log('Transcript fetch failed:', e instanceof Error ? e.message : String(e));
  }

  if (transcript) {
    const meta = await fetchPageMeta(url);
    const parts: string[] = [];
    if (meta.title) parts.push(`Video title: ${meta.title}`);
    if (meta.description) parts.push(`Video description: ${meta.description}`);
    parts.push(`Transcript:\n${transcript.slice(0, 40_000)}`);

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });

    const raw = message.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = parseClaudeJson(raw);
    if ('error' in parsed) throw new Error(parsed.error as string);
    return parsed as Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'>;
  }

  // ── Vision fallback: thumbnail + og metadata ──────────────────────────────
  const meta = await fetchPageMeta(url);

  if (!meta.title && !meta.description && !meta.thumbnailUrl) {
    throw new Error('Could not fetch any content for this video. It may be private or unavailable.');
  }

  const textParts: string[] = [];
  if (meta.title) textParts.push(`Video title: ${meta.title}`);
  if (meta.description) textParts.push(`Video description: ${meta.description}`);
  textParts.push('Extract whatever recipe information is visible. If the thumbnail shows a finished dish with no ingredient or step details, infer what you can from the title and description.');

  const contentBlocks: ContentBlock[] = [];

  if (meta.thumbnailUrl) {
    try {
      const { data, mediaType } = await fetchImageBase64(meta.thumbnailUrl);
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    } catch {
      // Thumbnail download failed — proceed with text only
    }
  }

  contentBlocks.push({ type: 'text', text: textParts.join('\n\n') });

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contentBlocks }],
  });

  const raw = message.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = parseClaudeJson(raw);

  // If Claude signals no recipe, return a partial stub so the app can offer manual entry
  if ('error' in parsed) {
    return {
      title: meta.title || 'Unknown Recipe',
      ingredients: [],
      steps: [],
      confidence: 'low',
    };
  }

  return { ...(parsed as Omit<Recipe, 'id' | 'source_url' | 'source_platform' | 'created_at'>), confidence: 'low' };
}

const EXTRACTION_SYSTEM_PROMPT = `You are a recipe extraction assistant.
Given cooking content (video transcript, Instagram caption, comments, and/or thumbnail image), extract the recipe and return ONLY valid JSON with no markdown:
{
  "title": "string",
  "ingredients": ["string"],
  "steps": ["string"]
}
Rules:
- Each ingredient entry includes the quantity (e.g. "200g spaghetti", "2 cloves garlic").
- Steps are plain text sentences with no numbering prefix.
- Instagram captions often contain the full recipe as a list — extract it faithfully even if the formatting is informal (emoji bullets, line breaks, etc.).
- If a pinned comment contains the recipe, prefer that over a vague caption.
- If no recipe can be determined at all, return { "error": "reason" }.`;

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post('/extract', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const platform = detectPlatform(url);
    const thumbnailTask = platform !== 'youtube'
      ? fetchPageMeta(url).then(m => m.thumbnailUrl || undefined).catch(() => undefined)
      : Promise.resolve(undefined);
    const [data, author, thumbnail_url] = await Promise.all([extractRecipe(url), fetchAuthor(url), thumbnailTask]);
    const recipe = {
      id: crypto.randomUUID(),
      source_url: url,
      source_platform: platform,
      ...(author ? { author } : {}),
      ...(thumbnail_url ? { thumbnail_url } : {}),
      ...data,
    };
    let { data: inserted, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select('id')
      .single();

    // Schema cache may not know about 'author' yet — retry without it
    if (error?.message?.includes('author')) {
      const { author: _a, ...recipeWithoutAuthor } = recipe;
      ({ data: inserted, error } = await supabase
        .from('recipes')
        .insert(recipeWithoutAuthor)
        .select('id')
        .single());
    }

    if (error) throw new Error(error.message);
    res.json({ id: inserted!.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    res.status(500).json({ error: message });
  }
});

app.get('/recipes', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

app.get('/recipe/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', req.params['id'])
    .single();
  if (error || !data) { res.status(404).json({ error: 'Recipe not found' }); return; }
  res.json(data);
});

app.patch('/recipe/:id', async (req: Request, res: Response) => {
  const { title, ingredients, steps } = req.body as Partial<Recipe>;
  const patch: Partial<Recipe> = {};
  if (title !== undefined) patch.title = title;
  if (ingredients !== undefined) patch.ingredients = ingredients;
  if (steps !== undefined) patch.steps = steps;
  const { data, error } = await supabase
    .from('recipes')
    .update(patch)
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: 'Recipe not found' }); return; }
  res.json(data);
});

app.delete('/recipe/:id', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', req.params['id']);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  const mode = MOCK_EXTRACT ? 'MOCK' : 'LIVE (Claude API)';
  console.log(`RecipeSnap server running on http://localhost:${PORT} [${mode}]`);
});
