import { join } from "path";
import { writeFileSync } from "fs";
import { getAssetsDir } from "../db/schema";
import { insertEntry, type Entry } from "../db/queries";

export async function ingestImageFromUrl(
  imageUrl: string,
  source = "manual",
  sourceRef?: string,
  title?: string,
): Promise<Entry> {
  const assetsDir = getAssetsDir();
  const timestamp = Date.now();
  const ext = imageUrl.match(/\.(\w+)(?:\?|$)/)?.[1] ?? "png";
  const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const assetPath = join(assetsDir, safeName);

  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000),
    });
    const buffer = await res.arrayBuffer();
    writeFileSync(assetPath, Buffer.from(buffer));
  } catch {
    // Store entry even if download fails
    return insertEntry({
      type: "image",
      source,
      source_ref: sourceRef,
      title: title ?? "Image",
      content: imageUrl,
      description: "Download failed",
    });
  }

  return insertEntry({
    type: "image",
    source,
    source_ref: sourceRef,
    title: title ?? safeName,
    content: imageUrl,
    asset_path: safeName,
  });
}

export function ingestImageFromBuffer(
  buffer: Buffer,
  filename: string,
  source = "manual",
  sourceRef?: string,
): Entry {
  const assetsDir = getAssetsDir();
  const timestamp = Date.now();
  const ext = filename.match(/\.(\w+)$/)?.[1] ?? "png";
  const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const assetPath = join(assetsDir, safeName);

  writeFileSync(assetPath, buffer);

  return insertEntry({
    type: "image",
    source,
    source_ref: sourceRef,
    title: filename,
    content: filename,
    asset_path: safeName,
  });
}
