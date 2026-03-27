import type { Message, Attachment } from "discord.js";
import { detectContentType, extractUrlsFromText, extractColorsFromText } from "../ingest/detect";
import { ingestUrl } from "../ingest/url";
import { ingestImageFromUrl } from "../ingest/image";
import { insertEntry, type Entry } from "../db/queries";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);

export async function processDiscordMessage(message: Message): Promise<Entry[]> {
  const entries: Entry[] = [];
  const text = message.content.trim();
  const messageId = message.id;

  // Process attachments first
  for (const attachment of message.attachments.values()) {
    const entry = await processAttachment(attachment, messageId);
    if (entry) entries.push(entry);
  }

  if (!text) return entries;

  // Extract URLs from the message
  const urls = extractUrlsFromText(text);
  for (const url of urls) {
    const entry = await ingestUrl(url, "discord", messageId);
    entries.push(entry);
  }

  // Extract standalone colors
  const colors = extractColorsFromText(text);
  // Only add colors not part of URLs
  const textWithoutUrls = urls.reduce((t, u) => t.replace(u, ""), text);
  const standaloneColors = extractColorsFromText(textWithoutUrls);
  for (const color of standaloneColors) {
    entries.push(
      insertEntry({
        type: "color",
        source: "discord",
        source_ref: messageId,
        content: color,
        metadata: { format: "hex" },
      }),
    );
  }

  // If no URLs or colors were found, treat as note
  // (but only if we didn't already get entries from the text)
  if (urls.length === 0 && standaloneColors.length === 0 && entries.length === 0) {
    const detected = detectContentType(text);
    if (detected.type === "font") {
      entries.push(
        insertEntry({
          type: "font",
          source: "discord",
          source_ref: messageId,
          content: detected.content,
          title: detected.title,
        }),
      );
    } else {
      entries.push(
        insertEntry({
          type: "note",
          source: "discord",
          source_ref: messageId,
          content: text,
          title: text.length > 80 ? text.slice(0, 77) + "..." : text,
        }),
      );
    }
  }

  return entries;
}

async function processAttachment(attachment: Attachment, messageId: string): Promise<Entry | null> {
  const contentType = attachment.contentType ?? "";

  if (IMAGE_TYPES.has(contentType) || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.name ?? "")) {
    return ingestImageFromUrl(attachment.url, "discord", messageId, attachment.name ?? undefined);
  }

  // Non-image attachments — store as note with link
  return insertEntry({
    type: "note",
    source: "discord",
    source_ref: messageId,
    title: attachment.name ?? "Attachment",
    content: attachment.url,
    description: `File: ${attachment.name} (${contentType}, ${Math.round((attachment.size ?? 0) / 1024)}KB)`,
  });
}
