import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import { EntryCard, EmptyState } from "./entry-card";
import type { Entry } from "../db/queries";

interface DashboardProps {
  entries: Entry[];
  stats: { total: number; byType: { type: string; n: number }[]; collections: number; starred: number };
  tags: { tag: string; count: number }[];
  filters: { type?: string; tag?: string; search?: string; starred?: boolean };
}

export const Dashboard: FC<DashboardProps> = ({ entries, stats, tags, filters }) => (
  <Layout title="cc-moodboard">
    {/* Site map — collapsible */}
    <details class="mb-6 border border-surface-3 rounded-lg overflow-hidden">
      <summary class="px-4 py-3 bg-surface-1 cursor-pointer text-sm text-gray-400 hover:text-white flex items-center gap-2">
        <span class="text-accent">&#9632;</span> Available Endpoints &amp; URLs
        <span class="ml-auto text-xs text-gray-500">llms.txt</span>
      </summary>
      <div class="px-4 py-4 text-sm grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <h3 class="text-white font-medium mb-2">Web Pages</h3>
          <ul class="space-y-1 text-gray-400">
            <li><a href="/" class="hover:text-accent">/ </a> — Dashboard</li>
            <li><a href="/add" class="hover:text-accent">/add</a> — Add entries</li>
            <li><a href="/collections" class="hover:text-accent">/collections</a> — Collections</li>
            <li><a href="/brief" class="hover:text-accent">/brief</a> — Design taste brief</li>
            <li><a href="/companion/" class="hover:text-accent">/companion/</a> — Brainstorm companion</li>
            <li><a href="/llms.txt" class="hover:text-accent">/llms.txt</a> — LLM-readable site map</li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-medium mb-2">API — Entries</h3>
          <ul class="space-y-1 text-gray-400">
            <li><code class="text-xs">GET</code> <a href="/api/v1/entries" class="hover:text-accent">/api/v1/entries</a></li>
            <li><code class="text-xs">GET</code> /api/v1/entries/:id</li>
            <li><code class="text-xs">POST</code> /api/v1/entries</li>
            <li><code class="text-xs">DELETE</code> /api/v1/entries/:id</li>
            <li><code class="text-xs">POST</code> /api/v1/entries/:id/star</li>
            <li><code class="text-xs">GET</code> <a href="/api/v1/stats" class="hover:text-accent">/api/v1/stats</a></li>
            <li><code class="text-xs">GET</code> <a href="/api/v1/tags" class="hover:text-accent">/api/v1/tags</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-medium mb-2">API — Collections &amp; Reactions</h3>
          <ul class="space-y-1 text-gray-400">
            <li><code class="text-xs">GET</code> <a href="/api/v1/collections" class="hover:text-accent">/api/v1/collections</a></li>
            <li><code class="text-xs">GET</code> /api/v1/collections/:id/entries</li>
            <li><code class="text-xs">GET</code> /api/v1/collections/:id/board</li>
            <li><code class="text-xs">GET</code> <a href="/api/v1/reactions" class="hover:text-accent">/api/v1/reactions</a></li>
            <li><code class="text-xs">POST</code> /api/v1/reactions</li>
            <li><code class="text-xs">POST</code> /api/v1/reactions/comment</li>
          </ul>
        </div>
      </div>
    </details>

    {/* Stats bar */}
    <div class="flex items-center gap-6 mb-6 text-sm text-gray-400">
      <span>{stats.total} entries</span>
      {stats.byType.map(({ type, n }) => (
        <a
          href={filters.type === type ? "/" : `/?type=${type}`}
          class={`hover:text-white ${filters.type === type ? "text-accent font-medium" : ""}`}
        >
          {n} {type}s
        </a>
      ))}
      <span class="ml-auto">{stats.collections} collections</span>
      <a
        href={filters.starred ? "/" : "/?starred=1"}
        class={`hover:text-yellow-400 ${filters.starred ? "text-yellow-400" : ""}`}
      >
        {filters.starred ? "\u2605" : "\u2606"} {stats.starred}
      </a>
    </div>

    {/* Search + filter bar */}
    <div class="flex gap-3 mb-6">
      <form action="/" method="get" class="flex-1 flex gap-2">
        {filters.type && <input type="hidden" name="type" value={filters.type} />}
        <input
          type="text"
          name="search"
          value={filters.search ?? ""}
          placeholder="Search entries..."
          class="input flex-1"
        />
        <button type="submit" class="btn btn-ghost">Search</button>
        {(filters.search || filters.type || filters.tag || filters.starred) && (
          <a href="/" class="btn btn-ghost text-red-400">Clear</a>
        )}
      </form>
    </div>

    {/* Tag cloud */}
    {tags.length > 0 && (
      <div class="flex flex-wrap gap-1 mb-6">
        {tags.slice(0, 30).map(({ tag, count }) => (
          <a
            href={filters.tag === tag ? "/" : `/?tag=${tag}`}
            class={`tag hover:bg-surface-4 ${filters.tag === tag ? "bg-accent/20 text-accent border border-accent/30" : ""}`}
          >
            {tag} <span class="text-gray-500 ml-1">{count}</span>
          </a>
        ))}
      </div>
    )}

    {/* Masonry grid */}
    {entries.length === 0 ? (
      <EmptyState />
    ) : (
      <div class="masonry">
        {entries.map((entry) => (
          <EntryCard entry={entry} />
        ))}
      </div>
    )}
  </Layout>
);
