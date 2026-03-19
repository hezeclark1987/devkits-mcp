#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as crypto from "crypto";

const server = new McpServer({
  name: "devkits-mcp-server",
  version: "1.0.0",
});

// ─────────────────────────────────────────────
// 1. JSON Format & Validate
// ─────────────────────────────────────────────
server.tool(
  "devkits_json_format",
  "Format and validate JSON. Returns formatted JSON with syntax validation.",
  {
    json: z.string().describe("Raw JSON string to format"),
    indent: z.number().optional().default(2).describe("Indentation spaces (default: 2)"),
  },
  async ({ json, indent }) => {
    try {
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, indent ?? 2);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              formatted,
              lines: formatted.split("\n").length,
              size: Buffer.byteLength(formatted, "utf8"),
            }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

// ─────────────────────────────────────────────
// 2. Base64 Encode
// ─────────────────────────────────────────────
server.tool(
  "devkits_base64_encode",
  "Encode a string to Base64 format.",
  {
    text: z.string().describe("Plain text string to encode"),
  },
  async ({ text }) => {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            encoded,
            originalLength: text.length,
            encodedLength: encoded.length,
          }),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// 3. Base64 Decode
// ─────────────────────────────────────────────
server.tool(
  "devkits_base64_decode",
  "Decode a Base64 encoded string back to plain text.",
  {
    encoded: z.string().describe("Base64 encoded string to decode"),
  },
  async ({ encoded }) => {
    try {
      const cleaned = encoded.trim();
      const decoded = Buffer.from(cleaned, "base64").toString("utf8");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              decoded,
              encodedLength: cleaned.length,
              decodedLength: decoded.length,
            }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

// ─────────────────────────────────────────────
// 4. JWT Decode
// ─────────────────────────────────────────────
server.tool(
  "devkits_jwt_decode",
  "Decode and inspect a JWT token (header, payload, signature). Does NOT verify signature.",
  {
    token: z.string().describe("JWT token string (three dot-separated base64url parts)"),
  },
  async ({ token }) => {
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT: expected 3 parts separated by dots");
      }

      const decodeBase64url = (str: string): unknown => {
        const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
        const decoded = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(decoded);
      };

      const header = decodeBase64url(parts[0]);
      const payload = decodeBase64url(parts[1]) as Record<string, unknown>;

      let expired = false;
      let expiresAt: string | null = null;
      if (typeof payload.exp === "number") {
        const expDate = new Date(payload.exp * 1000);
        expired = expDate < new Date();
        expiresAt = expDate.toISOString();
      }

      let issuedAt: string | null = null;
      if (typeof payload.iat === "number") {
        issuedAt = new Date(payload.iat * 1000).toISOString();
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              header,
              payload,
              signature: parts[2],
              meta: { expired, expiresAt, issuedAt },
              note: "Signature is NOT verified — decode only",
            }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

// ─────────────────────────────────────────────
// 5. Regex Test
// ─────────────────────────────────────────────
server.tool(
  "devkits_regex_test",
  "Test a regular expression against a string. Returns all matches with positions.",
  {
    pattern: z.string().describe("Regular expression pattern (without delimiters)"),
    text: z.string().describe("Input text to test against"),
    flags: z.string().optional().default("g").describe("Regex flags: g, i, m, s, u (default: g)"),
  },
  async ({ pattern, text, flags }) => {
    try {
      const activeFlags = flags ?? "g";
      const regex = new RegExp(pattern, activeFlags);
      const matches: Array<{ match: string; index: number; groups?: Record<string, string> }> = [];

      if (activeFlags.includes("g")) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.groups ?? undefined });
          if (m[0].length === 0) regex.lastIndex++;
        }
      } else {
        const m = regex.exec(text);
        if (m) {
          matches.push({ match: m[0], index: m.index, groups: m.groups ?? undefined });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              pattern,
              flags: activeFlags,
              isMatch: matches.length > 0,
              matchCount: matches.length,
              matches,
            }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

// ─────────────────────────────────────────────
// 6. URL Encode
// ─────────────────────────────────────────────
server.tool(
  "devkits_url_encode",
  "URL-encode a string (encodeURIComponent semantics).",
  {
    url: z.string().describe("URL or string to encode"),
  },
  async ({ url }) => {
    const encoded = encodeURIComponent(url);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, encoded, original: url }),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// 7. URL Decode
// ─────────────────────────────────────────────
server.tool(
  "devkits_url_decode",
  "URL-decode an encoded string (decodeURIComponent semantics).",
  {
    encoded: z.string().describe("URL-encoded string to decode"),
  },
  async ({ encoded }) => {
    try {
      const decoded = decodeURIComponent(encoded);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, decoded, original: encoded }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

// ─────────────────────────────────────────────
// 8. Hash Generate (local, no API)
// ─────────────────────────────────────────────
server.tool(
  "devkits_hash_generate",
  "Generate a cryptographic hash of a string using Node.js built-in crypto. Supports md5, sha1, sha256, sha384, sha512.",
  {
    text: z.string().describe("Input text to hash"),
    algorithm: z
      .enum(["md5", "sha1", "sha256", "sha384", "sha512"])
      .optional()
      .default("sha256")
      .describe("Hash algorithm (default: sha256)"),
  },
  async ({ text, algorithm }) => {
    const algo = algorithm ?? "sha256";
    const hash = crypto.createHash(algo).update(text, "utf8").digest("hex");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            algorithm: algo,
            hash,
            inputLength: text.length,
            hashLength: hash.length,
          }),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// 9. UUID Generate
// ─────────────────────────────────────────────
server.tool(
  "devkits_uuid_generate",
  "Generate one or more random UUID v4 strings.",
  {
    count: z
      .number()
      .optional()
      .default(1)
      .describe("Number of UUIDs to generate (default: 1, max: 100)"),
  },
  async ({ count }) => {
    const n = Math.min(Math.max(1, count ?? 1), 100);
    const uuids: string[] = [];
    for (let i = 0; i < n; i++) {
      uuids.push(crypto.randomUUID());
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, count: n, uuids }),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// 10. Markdown to HTML
// ─────────────────────────────────────────────
server.tool(
  "devkits_markdown_to_html",
  "Convert Markdown text to HTML. Supports headings, bold, italic, code blocks, links, lists, blockquotes, and horizontal rules.",
  {
    markdown: z.string().describe("Markdown formatted text to convert"),
  },
  async ({ markdown }) => {
    const html = convertMarkdownToHtml(markdown);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, html, inputLength: markdown.length }),
        },
      ],
    };
  }
);

function convertMarkdownToHtml(md: string): string {
  let html = md;

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^---+$/gm, "<hr>");

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Code blocks (fenced)
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold + Italic combined
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // List items
  html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Paragraphs — wrap bare text lines that are not already wrapped in a tag
  html = html.replace(/^([^<\n].+)$/gm, "<p>$1</p>");

  return html;
}

// ─────────────────────────────────────────────
// 11. Diff Compare
// ─────────────────────────────────────────────
server.tool(
  "devkits_diff_compare",
  "Compare two text strings line by line and return a unified diff-style result showing additions, deletions, and unchanged lines.",
  {
    text1: z.string().describe("Original text (left side)"),
    text2: z.string().describe("Modified text (right side)"),
  },
  async ({ text1, text2 }) => {
    const diff = computeDiff(text1, text2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(diff),
        },
      ],
    };
  }
);

interface DiffHunk {
  type: "added" | "removed" | "unchanged";
  line: string;
  lineNumber1: number | null;
  lineNumber2: number | null;
}

interface DiffResult {
  success: boolean;
  summary: { added: number; removed: number; unchanged: number };
  hunks: DiffHunk[];
  unified: string;
}

function computeDiff(a: string, b: string): DiffResult {
  const linesA = a.split("\n");
  const linesB = b.split("\n");

  const lcs = buildLcs(linesA, linesB);
  const hunks: DiffHunk[] = [];
  let i = 0, j = 0, k = 0;
  let lineNum1 = 1, lineNum2 = 1;
  const unified: string[] = [];

  while (i < linesA.length || j < linesB.length) {
    if (
      k < lcs.length &&
      i < linesA.length &&
      j < linesB.length &&
      linesA[i] === lcs[k] &&
      linesB[j] === lcs[k]
    ) {
      hunks.push({ type: "unchanged", line: linesA[i], lineNumber1: lineNum1++, lineNumber2: lineNum2++ });
      unified.push(" " + linesA[i]);
      i++; j++; k++;
    } else if (j < linesB.length && (k >= lcs.length || linesB[j] !== lcs[k])) {
      hunks.push({ type: "added", line: linesB[j], lineNumber1: null, lineNumber2: lineNum2++ });
      unified.push("+" + linesB[j]);
      j++;
    } else {
      hunks.push({ type: "removed", line: linesA[i], lineNumber1: lineNum1++, lineNumber2: null });
      unified.push("-" + linesA[i]);
      i++;
    }
  }

  const summary = {
    added: hunks.filter((h) => h.type === "added").length,
    removed: hunks.filter((h) => h.type === "removed").length,
    unchanged: hunks.filter((h) => h.type === "unchanged").length,
  };

  return { success: true, summary, hunks, unified: unified.join("\n") };
}

function buildLcs(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  // Guard against quadratic blowup on very large inputs
  if (m * n > 250000) return [];

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return lcs;
}

// ─────────────────────────────────────────────
// 12. Cron Parse
// ─────────────────────────────────────────────
server.tool(
  "devkits_cron_parse",
  "Parse and explain a cron expression. Returns a human-readable description and the next 5 scheduled run times.",
  {
    expression: z
      .string()
      .describe(
        "Cron expression with 5 fields: minute hour day-of-month month weekday (e.g. '0 9 * * 1-5')"
      ),
  },
  async ({ expression }) => {
    try {
      const result = parseCron(expression.trim());
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ...result }),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
      };
    }
  }
);

interface CronParseResult {
  expression: string;
  fields: { minute: string; hour: string; day: string; month: string; weekday: string };
  description: string;
  nextRuns: string[];
}

function parseCron(expr: string): CronParseResult {
  const parts = expr.split(/\s+/);
  if (parts.length !== 5)
    throw new Error("Cron expression must have exactly 5 fields: minute hour day month weekday");

  const [minute, hour, day, month, weekday] = parts;
  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const describeField = (val: string, unit: string, names?: string[]): string => {
    if (val === "*") return `every ${unit}`;
    if (val.startsWith("*/")) return `every ${val.slice(2)} ${unit}s`;
    if (val.includes(",")) {
      const items = val.split(",").map((v) => (names ? (names[parseInt(v)] ?? v) : v));
      return `${unit}s ${items.join(", ")}`;
    }
    if (val.includes("-")) {
      const [from, to] = val.split("-");
      const f = names ? (names[parseInt(from)] ?? from) : from;
      const t = names ? (names[parseInt(to)] ?? to) : to;
      return `${unit}s ${f} through ${t}`;
    }
    const named = names ? (names[parseInt(val)] ?? val) : val;
    return `${unit} ${named}`;
  };

  const parts2 = [
    describeField(minute, "minute"),
    describeField(hour, "hour"),
    day !== "*" ? `on ${describeField(day, "day of month")}` : null,
    month !== "*" ? `in ${describeField(month, "month", monthNames)}` : null,
    weekday !== "*" ? `on ${describeField(weekday, "weekday", dayNames)}` : null,
  ].filter(Boolean);

  const description = parts2.join(", ");
  const nextRuns = getNextCronRuns(parts, 5);

  return { expression: expr, fields: { minute, hour, day, month, weekday }, description, nextRuns };
}

function fieldMatches(value: number, field: string): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) return value % parseInt(field.slice(2)) === 0;
  if (field.includes(",")) return field.split(",").some((v) => parseInt(v) === value);
  if (field.includes("-")) {
    const [from, to] = field.split("-").map(Number);
    return value >= from && value <= to;
  }
  return parseInt(field) === value;
}

function getNextCronRuns(parts: string[], count: number): string[] {
  const [minF, hourF, dayF, monthF, wdayF] = parts;
  const runs: string[] = [];
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);

  const limit = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  const cur = new Date(now.getTime());

  while (cur < limit && runs.length < count) {
    if (
      fieldMatches(cur.getMinutes(), minF) &&
      fieldMatches(cur.getHours(), hourF) &&
      fieldMatches(cur.getDate(), dayF) &&
      fieldMatches(cur.getMonth() + 1, monthF) &&
      fieldMatches(cur.getDay(), wdayF)
    ) {
      runs.push(cur.toISOString());
    }
    cur.setMinutes(cur.getMinutes() + 1);
  }
  return runs;
}

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("DevKits MCP Server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
