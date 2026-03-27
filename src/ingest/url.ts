import { insertEntry, type Entry } from "../db/queries";

interface FetchResult {
  title: string;
  description: string;
  ogImage?: string;
  colors: string[];
  fonts: string[];
}

async function fetchUrlMetadata(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "cc-moodboard/0.1" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const description =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1] ??
      "";
    const ogImage =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1] ??
      undefined;

    // Extract colors from CSS custom properties and common patterns
    const colorMatches = html.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    const colors = [...new Set(colorMatches.map((c) => c.toLowerCase()))].slice(0, 20);

    // Extract font families
    const fontMatches = html.match(/font-family:\s*['"]?([^;'"}\n]+)/gi) ?? [];
    const fonts = [...new Set(
      fontMatches
        .map((f) => f.replace(/font-family:\s*/i, "").replace(/['",]/g, "").trim())
        .filter((f) => f && !f.includes("inherit") && !f.includes("system"))
    )].slice(0, 10);

    return { title, description, ogImage, colors, fonts };
  } catch {
    return { title: url, description: "", colors: [], fonts: [] };
  }
}

export async function ingestUrl(url: string, source = "manual", sourceRef?: string): Promise<Entry> {
  const meta = await fetchUrlMetadata(url);

  return insertEntry({
    type: "url",
    source,
    source_ref: sourceRef,
    title: meta.title || new URL(url).hostname,
    content: url,
    description: meta.description || undefined,
    tags: [],
    metadata: {
      ogImage: meta.ogImage,
      extractedColors: meta.colors,
      extractedFonts: meta.fonts,
    },
  });
}
