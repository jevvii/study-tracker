// scripts/export-notebooklm-sources.mjs
// Usage:
//   node scripts/export-notebooklm-sources.mjs <notebookId>
//
// This script does NOT call NotebookLM directly (no free API in 2026).
// It is a companion to the notebooklm MCP (run by Claude). Workflow:
//   1. Claude runs notebook_get(notebookId) to list sources (title + id).
//   2. Claude writes the source list to scripts/<notebookId>-sources.json
//      as [{ "title": "...", "url": "https://..." }, ...].
//   3. This script reads that file and emits ItemInput JSON for the import
//      dialog (one `resource` item per source).
import { readFileSync, writeFileSync } from 'node:fs';

const notebookId = process.argv[2];
if (!notebookId) { console.error('Usage: node scripts/export-notebooklm-sources.mjs <notebookId>'); process.exit(1); }

const infile = `scripts/${notebookId}-sources.json`;
const sources = JSON.parse(readFileSync(infile, 'utf8'));

const items = sources.map((s, i) => ({
  track: 'resource',
  sort_order: i + 1,
  title: s.title,
  metadata: {
    type: s.url?.includes('youtube') ? 'video' : 'article',
    url: s.url,
    source_url: s.url,
  },
}));

const out = `scripts/${notebookId}-items.json`;
writeFileSync(out, JSON.stringify(items, null, 2));
console.log(`Wrote ${items.length} resource items to ${out}`);