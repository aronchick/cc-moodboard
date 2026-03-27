import type { FC } from "hono/jsx";
import { Layout } from "./layout";

export const AddForm: FC<{ message?: string; error?: string }> = ({ message, error }) => (
  <Layout title="Add Entry — cc-moodboard">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-semibold text-white mb-6">Add Inspiration</h1>

      {message && (
        <div class="bg-green-900/30 border border-green-700 rounded-md p-3 mb-4 text-sm text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div class="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Quick add: paste anything */}
      <form action="/api/entries" method="post" enctype="multipart/form-data" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Drop anything here
          </label>
          <textarea
            name="content"
            rows={4}
            class="input w-full"
            placeholder="Paste a URL, hex color (#1a1a2e), font name (font: Inter), or a note..."
          />
          <p class="text-xs text-gray-500 mt-1">
            Auto-detects: URLs, hex/rgb/hsl colors, font names, plain text notes
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Or upload an image
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0 file:text-sm file:font-medium
                   file:bg-surface-3 file:text-gray-200 hover:file:bg-surface-4"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Tags <span class="text-gray-500">(comma-separated, optional)</span>
          </label>
          <input
            type="text"
            name="tags"
            class="input w-full"
            placeholder="dark-mode, dashboard, minimalist"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Description <span class="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            name="description"
            class="input w-full"
            placeholder="What do you like about this?"
          />
        </div>

        <button type="submit" class="btn btn-primary w-full">Add to Mood Board</button>
      </form>

      {/* Batch add */}
      <div class="mt-8 border-t border-surface-3 pt-6">
        <h2 class="text-lg font-medium text-white mb-4">Batch Add</h2>
        <form action="/api/entries/batch" method="post" class="space-y-4">
          <textarea
            name="items"
            rows={8}
            class="input w-full font-mono text-xs"
            placeholder={"One per line:\nhttps://dribbble.com/shots/example\n#1a1a2e\n#6366f1\nfont: Space Grotesk\nClean, minimal dashboard with heavy whitespace"}
          />
          <button type="submit" class="btn btn-primary w-full">Add All</button>
        </form>
      </div>
    </div>
  </Layout>
);
