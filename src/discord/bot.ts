import { Client, GatewayIntentBits, Partials, type Message } from "discord.js";
import { processDiscordMessage } from "./handlers";

let client: Client | null = null;

export async function startDiscordBot(token: string, channelId: string) {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.on("ready", () => {
    console.log(`Discord bot logged in as ${client!.user?.tag}`);
    console.log(`Watching channel: ${channelId}`);
  });

  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only process messages from the configured channel
    if (message.channelId !== channelId) return;

    try {
      const result = await processDiscordMessage(message);
      if (result.length > 0) {
        const summary = result.map((r) => `${r.type}: ${r.title ?? r.content.slice(0, 40)}`).join("\n");
        await message.reply(`Added ${result.length} entries:\n${summary}`);
      }
    } catch (err) {
      console.error("Error processing Discord message:", err);
      await message.react("\u274c").catch(() => {});
    }
  });

  await client.login(token);
}

export function getClient(): Client | null {
  return client;
}
