import type { EntryType } from "../db/queries";

const URL_RE = /^https?:\/\//i;
const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
const RGB_RE = /^rgba?\(\s*\d+/i;
const HSL_RE = /^hsla?\(\s*\d+/i;

const KNOWN_FONTS = new Set([
  "inter", "roboto", "helvetica", "arial", "georgia", "garamond", "futura",
  "montserrat", "playfair display", "lato", "open sans", "poppins", "raleway",
  "merriweather", "nunito", "source sans", "dm sans", "space grotesk",
  "plus jakarta sans", "outfit", "geist", "satoshi", "general sans",
  "cabinet grotesk", "clash display", "sf pro", "neue montreal",
]);

export interface DetectedContent {
  type: EntryType;
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export function detectContentType(raw: string): DetectedContent {
  const trimmed = raw.trim();

  // URL
  if (URL_RE.test(trimmed)) {
    return { type: "url", content: trimmed };
  }

  // Color: hex
  if (HEX_RE.test(trimmed)) {
    return {
      type: "color",
      content: trimmed.toLowerCase(),
      metadata: { format: "hex" },
    };
  }

  // Color: rgb/rgba
  if (RGB_RE.test(trimmed)) {
    return {
      type: "color",
      content: trimmed,
      metadata: { format: "rgb" },
    };
  }

  // Color: hsl/hsla
  if (HSL_RE.test(trimmed)) {
    return {
      type: "color",
      content: trimmed,
      metadata: { format: "hsl" },
    };
  }

  // Font: check if it matches known fonts or has "font:" prefix
  const fontMatch = trimmed.match(/^font:\s*(.+)$/i);
  if (fontMatch) {
    return {
      type: "font",
      content: fontMatch[1].trim(),
      title: fontMatch[1].trim(),
    };
  }

  const lower = trimmed.toLowerCase();
  if (KNOWN_FONTS.has(lower)) {
    return { type: "font", content: trimmed, title: trimmed };
  }

  // Default: note
  return {
    type: "note",
    content: trimmed,
    title: trimmed.length > 80 ? trimmed.slice(0, 77) + "..." : trimmed,
  };
}

export function extractColorsFromText(text: string): string[] {
  const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
  return [...new Set(hexMatches.map((c) => c.toLowerCase()))];
}

export function extractUrlsFromText(text: string): string[] {
  const urlMatches = text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
  return [...new Set(urlMatches)];
}
