import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { join } from "path";

import { initDb, getAssetsDir } from "./db/schema";
import dashboard from "./routes/dashboard.tsx";
import entries from "./routes/entries.tsx";
import collections from "./routes/collections.tsx";
import api from "./routes/api";
import { startDiscordBot } from "./discord/bot";
import { getConfig } from "./db/queries";

// Init database
initDb();

const app = new Hono();

// Middleware
app.use("*", logger());

// Static files
app.use("/styles.css", serveStatic({ root: "./public" }));
app.use("/app.js", serveStatic({ root: "./public" }));

// Serve assets from the moodboard assets directory
app.get("/assets/:filename", (c) => {
  const filename = c.req.param("filename");
  // Sanitize: only allow alphanumeric, dash, underscore, dot
  if (!/^[\w\-\.]+$/.test(filename)) return c.text("Bad request", 400);
  const filePath = join(getAssetsDir(), filename);
  return new Response(Bun.file(filePath));
});

// Routes
app.route("/", dashboard);
app.route("/", entries);
app.route("/", collections);
app.route("/", api);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

const PORT = parseInt(process.env.PORT ?? "3100");

console.log(`cc-moodboard starting on http://localhost:${PORT}`);

// Start Discord bot if configured
const discordToken = process.env.DISCORD_BOT_TOKEN ?? getConfig("discord_token");
const discordChannel = process.env.DISCORD_CHANNEL_ID ?? getConfig("discord_channel_id");
if (discordToken && discordChannel) {
  startDiscordBot(discordToken, discordChannel).catch((err) =>
    console.error("Discord bot failed to start:", err),
  );
} else {
  console.log("Discord bot not configured (set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID)");
}

export default {
  port: PORT,
  fetch: app.fetch,
};
