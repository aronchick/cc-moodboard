import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import { EntryCard } from "./entry-card";
import type { Entry, Collection } from "../db/queries";

export const CollectionList: FC<{ collections: Collection[] }> = ({ collections }) => (
  <Layout title="Collections — cc-moodboard">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold text-white">Collections</h1>
      <button
        class="btn btn-primary"
        onclick="document.getElementById('new-collection-form').classList.toggle('hidden')"
      >
        + New Collection
      </button>
    </div>

    {/* New collection form */}
    <form
      id="new-collection-form"
      action="/api/collections"
      method="post"
      class="hidden bg-surface-1 border border-surface-3 rounded-lg p-4 mb-6 space-y-3"
    >
      <input type="text" name="name" placeholder="Collection name" class="input w-full" required />
      <input type="text" name="description" placeholder="Description (optional)" class="input w-full" />
      <button type="submit" class="btn btn-primary">Create</button>
    </form>

    {collections.length === 0 ? (
      <div class="text-center py-20 text-gray-500">
        <p>No collections yet. Create one to organize your inspiration.</p>
      </div>
    ) : (
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((c) => (
          <a href={`/collections/${c.id}`} class="card p-4 hover:bg-surface-2 block">
            <h3 class="font-medium text-white">{c.name}</h3>
            {c.description && <p class="text-sm text-gray-400 mt-1">{c.description}</p>}
            <p class="text-xs text-gray-500 mt-2">
              {c.entry_count ?? 0} entries &middot; {new Date(c.created_at).toLocaleDateString()}
            </p>
          </a>
        ))}
      </div>
    )}
  </Layout>
);

export const CollectionDetail: FC<{
  collection: Collection;
  entries: Entry[];
  allEntries: Entry[];
}> = ({ collection, entries, allEntries }) => (
  <Layout title={`${collection.name} — cc-moodboard`}>
    <div class="flex items-center justify-between mb-6">
      <div>
        <a href="/collections" class="text-sm text-gray-500 hover:text-gray-300">&larr; Collections</a>
        <h1 class="text-2xl font-semibold text-white mt-1">{collection.name}</h1>
        {collection.description && <p class="text-sm text-gray-400 mt-1">{collection.description}</p>}
      </div>
      <div class="flex gap-2">
        <a href={`/collections/${collection.id}/synthesize`} class="btn btn-primary">
          Synthesize
        </a>
        <button
          class="btn btn-ghost"
          onclick="document.getElementById('add-to-collection').classList.toggle('hidden')"
        >
          + Add entries
        </button>
        <form action={`/api/collections/${collection.id}/delete`} method="post">
          <button type="submit" class="btn btn-ghost text-red-400 hover:text-red-300" onclick="return confirm('Delete this collection?')">
            Delete
          </button>
        </form>
      </div>
    </div>

    {/* Add entries to collection */}
    <div id="add-to-collection" class="hidden bg-surface-1 border border-surface-3 rounded-lg p-4 mb-6">
      <h3 class="text-sm font-medium text-gray-300 mb-2">Add entries to this collection</h3>
      <form action={`/api/collections/${collection.id}/entries`} method="post" class="flex gap-2">
        <select name="entry_id" class="input flex-1">
          {allEntries
            .filter((e) => !entries.find((ce) => ce.id === e.id))
            .map((e) => (
              <option value={e.id}>
                [{e.type}] {e.title ?? e.content.slice(0, 60)}
              </option>
            ))}
        </select>
        <button type="submit" class="btn btn-primary">Add</button>
      </form>
    </div>

    <p class="text-sm text-gray-500 mb-4">{entries.length} entries</p>

    {entries.length === 0 ? (
      <div class="text-center py-20 text-gray-500">
        <p>This collection is empty. Add entries to get started.</p>
      </div>
    ) : (
      <div class="masonry">
        {entries.map((entry) => (
          <div class="relative group/ce">
            <EntryCard entry={entry} />
            <form
              action={`/api/collections/${collection.id}/entries/${entry.id}/remove`}
              method="post"
              class="absolute top-2 right-2 opacity-0 group-hover/ce:opacity-100 transition-opacity"
            >
              <button
                type="submit"
                class="bg-red-900/80 text-red-300 rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-800"
                title="Remove from collection"
              >
                &times;
              </button>
            </form>
          </div>
        ))}
      </div>
    )}
  </Layout>
);
