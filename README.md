# Raccoon reader

A client-only web reader for Raccoon learning artifacts on desktop, tablet and
phone browsers.

## Open in a browser

1. Synchronize your source repository and select the analyzed PR branch using
   your preferred Git client. On iPad, use the existing **GitSync** iOS app.
2. Open [Raccoon reader](https://bajor.github.io/raccoon-reader/) in your browser.
   On iPad, use Safari (iPadOS 18.4+) and optionally add it to the Home Screen.
3. Select **Import raccoon-artifacts folder** and choose that version-2 folder
   in your browser's folder picker.
4. Open an article, adjust text size, then press **Read**. Tap the page to reveal
   **Show controls**, or press Escape to exit reading mode.
5. Tap an inline diagram for a screen-filling, automatically fitted view. Rotate
   the device to change the fit; no manual zoom is needed. **Print** prints the
    complete article, wrapped code and page-fitted diagrams without application controls.
    Changes appear side-by-side with Python-first highlighting. On narrow screens,
    scroll the comparison region horizontally; source indentation is preserved.
6. After changing branches or synchronizing your repository, select the folder again.
   Imports are snapshots, not a live connection to a directory.

The application host receives no imported code. Imports, settings and reading
progress stay in this browser. Browser storage may be evicted or cleared; it is
not a backup. A complete import is verified before it replaces the old local copy.
An empty repository catalog removes that repository's previously cached PRs.
Regenerated snapshots reset only the regenerated PR's reading progress.
Checksums detect incomplete or modified assets, not the identity of their author
or the truth of AI explanations. Import only repositories you intend to read.

This redesign accepts version 2 only. Older artifacts require explicit removal
and regeneration through Raccoon. Old browser data is not migrated or deleted;
the new article database is separate.

Use Raccoon beside ChatGPT with repository context for questions, and Freeform or
another notes app for your own diagrams and notes. No chat service is embedded here.

Recommend the opt-in [merge cleanup workflow](https://github.com/bajor/github-workflows)
in analyzed repositories. Cleanup removes artifacts from `main`, not Git history
or already imported browser copies. Synchronize and re-import, or remove the local copy.

## Development

Node.js 22+ and npm are required. `npm ci`, then `make test`. Browser tests use
Playwright Chromium and WebKit; install them with `npx playwright install --with-deps`.
Run tests through `npm test` (or `make test`), so the version-guarded upstream
Playwright 1.64.1 directory-upload fix is applied. See [the recorded driver race](docs/import-behavior.md).
`npm run dev` starts the application. `npm run build` creates relative-path static
assets for GitHub Pages. No backend, GitHub credential or model key is used.

Articles are English, with contents and functional chapters. Code excerpts and
history are part of the continuous explanation, not separate panes or navigation.
Reading a chapter's end marks it read. **Mark unread** keeps it unread until the
article is reopened. Theme and article text size are local.

Keyboard: `f` toggles Read mode; Escape closes a diagram or returns controls.
After one successful online load, the application shell and imported data can be
used offline. Browser eviction can still remove either cache. Close and reopen the
reader online to activate an available application update.

Physical iPad Files/GitSync selection still needs real-device acceptance; desktop
browser automation cannot prove it works.

## Docs index

See [docs/index.md](docs/index.md). The [MCP repository](https://github.com/bajor/raccoon-mcp)
owns the portable contract. `src/vendor/provenance.json` pins the generated copy.
