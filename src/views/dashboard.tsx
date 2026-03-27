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
