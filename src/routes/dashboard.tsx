import { Hono } from "hono";
import { Dashboard } from "../views/dashboard";
import { listEntries, getStats, getAllTags } from "../db/queries";

const app = new Hono();

app.get("/", (c) => {
  const type = c.req.query("type");
  const tag = c.req.query("tag");
  const search = c.req.query("search");
  const starred = c.req.query("starred") === "1";

  const entries = listEntries({ type, tag, search, starred: starred || undefined });
  const stats = getStats();
  const tags = getAllTags();

  return c.html(
    <Dashboard
      entries={entries}
      stats={stats}
      tags={tags}
      filters={{ type, tag, search, starred }}
    />,
  );
});

export default app;
