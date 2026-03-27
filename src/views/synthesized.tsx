import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import type { Collection, SynthesizedBoard } from "../db/queries";

export const SynthesizedView: FC<{
  collection: Collection;
  board: SynthesizedBoard;
}> = ({ collection, board }) => (
  <Layout title={`Mood Board: ${collection.name}`}>
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <a href={`/collections/${collection.id}`} class="text-sm text-gray-500 hover:text-gray-300">
            &larr; {collection.name}
          </a>
          <h1 class="text-2xl font-semibold text-white mt-1">Mood Board: {collection.name}</h1>
          <p class="text-xs text-gray-500 mt-1">
            Generated {new Date(board.created_at).toLocaleString()}
          </p>
        </div>
        <div class="flex gap-2">
          <a
            href={`/api/collections/${collection.id}/synthesize/markdown`}
            class="btn btn-ghost"
          >
            Export .md
          </a>
          {board.design_brief && (
            <a
              href={`/api/collections/${collection.id}/synthesize/brief`}
              class="btn btn-primary"
            >
              Design Brief
            </a>
          )}
        </div>
      </div>

      {/* Rendered board — content is generated server-side from our own DB, not user HTML */}
      <div class="bg-surface-1 border border-surface-3 rounded-lg p-8">
        <MarkdownContent markdown={board.board_markdown} />
      </div>
    </div>
  </Layout>
);

// Parse markdown into safe JSX elements
const MarkdownContent: FC<{ markdown: string }> = ({ markdown }) => {
  const lines = markdown.split("\n");
  const elements: any[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      elements.push(<h1 class="text-2xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 class="text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 class="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      elements.push(<li class="text-gray-300 ml-4 text-sm">{line.slice(2)}</li>);
    } else if (line.startsWith("| ")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      elements.push(
        <div class="flex gap-2 text-sm">
          {cells.map((c) => (
            <span class="border border-surface-4 px-3 py-1 flex-1">{c}</span>
          ))}
        </div>,
      );
    } else if (line.trim() === "") {
      elements.push(<div class="mt-3" />);
    } else {
      elements.push(<p class="text-gray-300 text-sm">{line}</p>);
    }
  }

  return <div>{elements}</div>;
};
