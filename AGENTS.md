# Raccoon reader

## Living Docs
enforcement: strict
onboarded: 2026-10-18

Read [docs/index.md](docs/index.md) before structural changes. Keep the indexed
constitution, requirements, decisions and behavior records aligned with code.
Render review diagrams outside the repository; commit only temporary SVGs under
`visual-explanations/`. Run `make test` before committing. Node.js 22+ is required.

`src/vendor/contract.ts` is generated from a pinned Raccoon MCP revision. Update
it through `scripts/sync-contract.mjs`, never by hand. Imported content is untrusted.
Never render narrative or source as HTML or upload local artifacts.
