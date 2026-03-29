# @hezeclark1987/devkits-mcp-server

> 12 developer tools for AI assistants — powered by [DevKits](https://aiforeverthing.com)

An MCP (Model Context Protocol) server that exposes DevKits developer utilities directly inside Claude Desktop, Cursor, Continue, and any other MCP-compatible AI tool. All tools run **locally** with no external API calls.

---

## About DevKits

[**DevKits**](https://aiforeverthing.com) is your all-in-one developer toolkit with **200+ free online tools**:

- **Format & Validate**: JSON, XML, CSS, HTML
- **Encode & Decode**: Base64, JWT, URL, HTML entities
- **Generate**: UUIDs, hashes, QR codes, passwords
- **Convert**: Markdown to HTML, timestamps, colors
- **Analyze**: Regex testing, cron expressions, text diffs
- **And more**: Crypto, finance, devops, security tools

**Why DevKits?**
- **100% Free** — No signup required
- **Privacy First** — Everything runs in your browser
- **Works Offline** — PWA support for offline usage
- **200+ Tools** — One stop shop for all developer needs

**Pro Version**: Unlock 24 pro tools for $9 one-time (vs $168/year for Postman)

👉 Visit [aiforeverthing.com](https://aiforeverthing.com) now!

---

## Installation

### Option A — npx (no install)

```bash
npx @hezeclark1987/devkits-mcp-server
```

### Option B — global install

```bash
npm install -g @hezeclark1987/devkits-mcp-server
```

---

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "devkits": {
      "command": "npx",
      "args": ["@hezeclark1987/devkits-mcp-server"]
    }
  }
}
```

---

## Cursor Configuration

Add to `.cursor/mcp.json` in your project root, or to the global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "devkits": {
      "command": "npx",
      "args": ["@hezeclark1987/devkits-mcp-server"]
    }
  }
}
```

---

## Continue (VS Code) Configuration

Add to `~/.continue/config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["@hezeclark1987/devkits-mcp-server"]
        }
      }
    ]
  }
}
```

---

## Available Tools

| Tool | Description | Parameters |
|------|-------------|-----------|
| `devkits_json_format` | Format & validate JSON | `json`, `indent?` |
| `devkits_base64_encode` | Encode text to Base64 | `text` |
| `devkits_base64_decode` | Decode Base64 to text | `encoded` |
| `devkits_jwt_decode` | Decode JWT header & payload | `token` |
| `devkits_regex_test` | Test regex against input | `pattern`, `text`, `flags?` |
| `devkits_url_encode` | URL-encode a string | `url` |
| `devkits_url_decode` | URL-decode a string | `encoded` |
| `devkits_hash_generate` | Generate SHA/MD5 hash | `text`, `algorithm?` |
| `devkits_uuid_generate` | Generate UUID v4 | `count?` |
| `devkits_markdown_to_html` | Convert Markdown to HTML | `markdown` |
| `devkits_diff_compare` | Line-by-line text diff | `text1`, `text2` |
| `devkits_cron_parse` | Parse & explain cron expression | `expression` |

---

## Examples

**Format JSON:**
```
Use devkits_json_format to pretty-print {"name":"Alice","age":30}
```

**Decode a JWT:**
```
Decode this JWT with devkits_jwt_decode: eyJhbGciOiJIUzI1NiJ9...
```

**Generate hashes:**
```
Hash the string "hello world" with sha256 using devkits_hash_generate
```

**Parse a cron expression:**
```
Explain the cron expression "0 9 * * 1-5" using devkits_cron_parse
```

---

## Build from Source

```bash
git clone https://github.com/hezeclark1987/devkits-mcp
cd devkits-mcp
npm install
npm run build
npm start
```

---

## License

MIT — built with love by [DevKits](https://aiforeverthing.com)
