import { Hono } from "hono";
import { readFileSync } from "fs";
import { join } from "path";

const app = new Hono();

const BRIEF_PATH = join(
  import.meta.dir,
  "../../docs/superpowers/specs/2026-03-29-kurate-taste-brief-design.md"
);

// Section name -> markdown heading pattern mapping
// Each section maps to the heading text that starts it; the section runs until the next heading of equal or higher level.
const SECTION_MAP: Record<string, { heading: string; level: number }> = {
  principles: { heading: "### Layer 1: Core Principles (Always Apply)", level: 3 },
  tokens: { heading: "### Design Tokens", level: 3 },
  typography: { heading: "**Typography Scale:**", level: -1 }, // bold subsection
  spacing: { heading: "**Spacing Scale (8px grid):**", level: -1 },
  radius: { heading: "**Border Radius:**", level: -1 },
  shadows: { heading: "**Shadows:**", level: -1 },
  motion: { heading: "**Motion:**", level: -1 },
  responsive: { heading: "**Responsive Breakpoints:**", level: -1 },
  states: { heading: "**Interactive States:**", level: -1 },
  colors: { heading: "**Colors:**", level: -1 },
  brand: { heading: "### Brand Foundation: Expanso", level: 3 },
  "anti-patterns": { heading: "### Layer 3: Anti-Patterns (Never Do This)", level: 3 },
  review: { heading: "## Part 2: The Review Mode", level: 2 },
  "context-tools": {
    heading: "**Tool / Dashboard UI (Linear, Stripe, Supabase, Figma reference)**",
    level: -1,
  },
  "context-marketing": {
    heading: "**Marketing / Messaging Pages (Apple reference)**",
    level: -1,
  },
  "context-docs": {
    heading: "**Documentation / Brief Output (Tailwind reference)**",
    level: -1,
  },
  "context-editorial": {
    heading: "**Editorial / Storytelling**",
    level: -1,
  },
};

const VALID_SECTIONS = Object.keys(SECTION_MAP);

// Context name -> section key mapping
const CONTEXT_MAP: Record<string, string> = {
  tools: "context-tools",
  marketing: "context-marketing",
  docs: "context-docs",
  editorial: "context-editorial",
};

function readBrief(): string {
  return readFileSync(BRIEF_PATH, "utf-8");
}

/**
 * Extract a section from the markdown by finding the heading line and collecting
 * everything until the next section boundary.
 */
function extractSection(markdown: string, sectionKey: string): string | null {
  const mapping = SECTION_MAP[sectionKey];
  if (!mapping) return null;

  const lines = markdown.split("\n");
  const startIdx = lines.findIndex((line) => line.trim() === mapping.heading);
  if (startIdx === -1) return null;

  // For bold subsections (level -1), collect until next bold subsection or heading
  if (mapping.level === -1) {
    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      // Stop at next bold subsection header or any markdown heading
      if (
        (line.startsWith("**") && line.endsWith("**") && !line.includes("|")) ||
        (line.startsWith("**") && line.endsWith(":**")) ||
        line.startsWith("### ") ||
        line.startsWith("## ") ||
        line.startsWith("# ")
      ) {
        endIdx = i;
        break;
      }
    }
    return lines.slice(startIdx, endIdx).join("\n").trim();
  }

  // For heading-level sections, collect until next heading of equal or higher level
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#")) {
      const headingLevel = line.match(/^(#+)/)?.[1].length ?? 99;
      if (headingLevel <= mapping.level) {
        endIdx = i;
        break;
      }
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

/**
 * Parse the full markdown into structured JSON sections.
 */
function briefToJson(
  markdown: string,
  onlySections?: string[]
): Record<string, string> {
  const sections: Record<string, string> = {};
  const keys = onlySections ?? VALID_SECTIONS;

  for (const key of keys) {
    const content = extractSection(markdown, key);
    if (content) {
      sections[key] = content;
    }
  }
  return sections;
}

// GET /brief
app.get("/brief", (c) => {
  const format = c.req.query("format");
  const only = c.req.query("only");
  const context = c.req.query("context");

  const markdown = readBrief();

  // Filter to specific sections
  if (only) {
    const requested = only.split(",").map((s) => s.trim());
    const invalid = requested.filter((s) => !VALID_SECTIONS.includes(s));
    if (invalid.length > 0) {
      return c.json(
        {
          error: `Invalid sections: ${invalid.join(", ")}`,
          valid: VALID_SECTIONS,
        },
        400
      );
    }

    if (format === "json") {
      return c.json(briefToJson(markdown, requested));
    }

    // Return filtered markdown
    const parts = requested
      .map((key) => extractSection(markdown, key))
      .filter(Boolean);
    c.header("Content-Type", "text/markdown; charset=utf-8");
    return c.body(parts.join("\n\n---\n\n"));
  }

  // Promote a context section to the top
  if (context) {
    const sectionKey = CONTEXT_MAP[context];
    if (!sectionKey) {
      return c.json(
        {
          error: `Invalid context: ${context}`,
          valid: Object.keys(CONTEXT_MAP),
        },
        400
      );
    }

    const contextSection = extractSection(markdown, sectionKey);
    if (contextSection) {
      const promoted =
        `> **Active context: ${context}**\n\n${contextSection}\n\n---\n\n${markdown}`;

      if (format === "json") {
        const json = briefToJson(markdown);
        return c.json({ activeContext: context, promotedSection: contextSection, ...json });
      }

      c.header("Content-Type", "text/markdown; charset=utf-8");
      return c.body(promoted);
    }
  }

  // Full brief
  if (format === "json") {
    return c.json(briefToJson(markdown));
  }

  c.header("Content-Type", "text/markdown; charset=utf-8");
  return c.body(markdown);
});

export default app;
