---
type: ADR
description: Use the Pierre vanilla File and FileDiff components over verified Git assets.
status: Accepted
---

# Library-owned code rendering

Use `@pierre/diffs` 1.6.1 directly with its vanilla API. It owns diff parsing,
alignment, intra-line changes, syntax and Shadow DOM rendering. Do not copy its
algorithms or migrate the reader to React. Reject heuristic pairing of old code
blocks: the MCP-owned additive v2 contract explicitly names comparison endpoints.

Pass complete files to comparisons and window full-file context with `File`'s
range API. This preserves Python multiline syntax and original line numbers.
`null` means absent; an empty Git file remains an existing side. Cache decoded
files and comparison metadata per article; dispose all component instances.

Preload Python and light/dark themes with stable Shiki JS. A build-time catalog
limits syntax to Python, TypeScript, JavaScript, JSON, YAML, TOML, Bash, Markdown,
INI, CSS and HTML. Other files remain literal plain text. The small catalog
imports upstream grammars/themes; it implements no language or diff logic.
No worker pool or experimental Highlights backend is enabled.

The full library catalog produced 408 cached files and 12 MiB locally. Limiting
catalogs reduces the build to about 2.5 MiB. All chunks and binary assets are
same-origin and precached. No CDN or source-upload API is used.

Permit inline **styles** in CSP for library token colors and theme stylesheets;
scripts remain same-origin-only. Imported prose uses text nodes; source becomes
escaped library tokens, never executable imported HTML. The libraries are
Apache-2.0 (`@pierre/*`) and MIT (Shiki). No algorithms are vendored.

# References

1. THE PIERRE COMPUTER COMPANY. *Diffs documentation*. Available at:
   <https://diffs.com/llms-full.txt>. Accessed on: 2026-10-22.
