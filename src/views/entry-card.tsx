import type { FC } from "hono/jsx";
import type { Entry } from "../db/queries";

export const EntryCard: FC<{ entry: Entry }> = ({ entry }) => {
  const tags: string[] = JSON.parse(entry.tags || "[]");
  const metadata = JSON.parse(entry.metadata || "{}");

  return (
    <div class="card group" id={`entry-${entry.id}`}>
      {/* Image / Visual */}
      {entry.type === "image" && entry.asset_path && (
        <img
          src={`/assets/${entry.asset_path}`}
          alt={entry.title ?? ""}
          class="card-image cursor-pointer"
          onclick={`openLightbox('/assets/${entry.asset_path}')`}
          loading="lazy"
        />
      )}

      {entry.type === "url" && metadata.ogImage && (
        <img
          src={metadata.ogImage}
          alt={entry.title ?? ""}
          class="card-image"
          loading="lazy"
        />
      )}

      {entry.type === "color" && (
        <div
          class="w-full h-24 rounded-t-lg"
          style={`background-color: ${entry.content}`}
        />
      )}

      {entry.type === "font" && (
        <div class="w-full h-24 rounded-t-lg bg-surface-2 flex items-center justify-center">
          <span
            class="text-3xl text-white"
            style={`font-family: '${entry.content}', sans-serif`}
          >
            Aa Bb Cc
          </span>
        </div>
      )}

      {/* Body */}
      <div class="card-body">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="tag mb-1">{entry.type}</span>
            {entry.title && (
              <h3 class="text-sm font-medium text-gray-100 truncate mt-1">
                {entry.title}
              </h3>
            )}
          </div>

          {/* Star + Delete */}
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class={`text-xs p-1 rounded hover:bg-surface-3 ${entry.starred ? "text-yellow-400" : "text-gray-500"}`}
              hx-post={`/api/entries/${entry.id}/star`}
              hx-target={`#entry-${entry.id}`}
              hx-swap="outerHTML"
            >
              {entry.starred ? "\u2605" : "\u2606"}
            </button>
            <button
              class="text-xs p-1 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400"
              hx-delete={`/api/entries/${entry.id}`}
              hx-target={`#entry-${entry.id}`}
              hx-swap="outerHTML"
              hx-confirm="Delete this entry?"
            >
              &times;
            </button>
          </div>
        </div>

        {entry.type === "color" && (
          <p class="text-xs font-mono text-gray-400 mt-1">{entry.content}</p>
        )}

        {entry.type === "url" && (
          <a
            href={entry.content}
            target="_blank"
            rel="noopener"
            class="text-xs text-accent hover:underline truncate block mt-1"
          >
            {new URL(entry.content).hostname}
          </a>
        )}

        {entry.description && (
          <p class="text-xs text-gray-400 mt-1 line-clamp-3">{entry.description}</p>
        )}

        {tags.length > 0 && (
          <div class="flex flex-wrap gap-1 mt-2">
            {tags.map((tag: string) => (
              <a href={`/?tag=${encodeURIComponent(tag)}`} class="tag hover:bg-surface-4 text-[10px]">
                {tag}
              </a>
            ))}
          </div>
        )}

        <p class="text-[10px] text-gray-600 mt-2">
          {entry.source} &middot; {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export const EmptyState: FC = () => (
  <div class="col-span-full text-center py-20">
    <div class="text-4xl mb-4">&#9632;</div>
    <h2 class="text-lg font-medium text-gray-300">No entries yet</h2>
    <p class="text-sm text-gray-500 mt-1">
      Drop URLs, images, colors, fonts, or notes to start building your mood board.
    </p>
    <a href="/add" class="btn btn-primary mt-4 inline-block">+ Add your first entry</a>
  </div>
);
