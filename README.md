# Raccoon reader

A client-only web reader for Raccoon learning artifacts. This repository name is
historical: there is no native iOS app, Xcode project or TestFlight build.

## On iPad

1. Use the existing **GitSync** iOS app to synchronize your source repository and
   select the analyzed PR branch.
2. Open [the reader](https://bajor.github.io/raccoon-ios/) in Safari (iPadOS 18.4+).
   Optionally add it to the Home Screen.
3. Select **Import raccoon-artifacts folder** and choose that folder in Files.
4. After changing branches or synchronizing in GitSync, select the folder again.
   Imports are snapshots, not a live connection to a directory.

The application host receives no imported code. Imports, settings and reading
progress stay in this browser. Browser storage may be evicted or cleared; it is
not a backup. A complete import is verified before it replaces the old local copy.
An empty repository catalog removes that repository's previously cached PRs.
Regenerated snapshots reset only the regenerated PR's reading progress.
Checksums detect incomplete or modified assets, not the identity of their author
or the truth of AI explanations. Import only repositories you intend to read.

Use Raccoon beside ChatGPT with repository context for questions, and Freeform or
another notes app for your own diagrams and notes. No chat service is embedded here.

Recommend the opt-in [merge cleanup workflow](https://github.com/bajor/github-workflows)
in analyzed repositories. Cleanup removes artifacts from `main`, not Git history
or already imported browser copies. Synchronize and re-import, or remove the local copy.

## Development

Node.js 22+ and npm are required. `npm ci`, then `make test`. Browser tests use
Playwright Chromium and WebKit; install them with `npx playwright install --with-deps`.
`npm run dev` starts the application. `npm run build` creates relative-path static
assets for GitHub Pages. No backend, GitHub credential or model key is used.

Open a PR and choose a functional thread. The final explanation opens first, with
the complete referenced file. Use **History map and commit shortcuts** for older
stages, **Show diagrams** for that thread's diagrams, and **Hide narrative** for
more code space. Repeated references keep their own ordered navigation positions.
Reading the explanation's end marks it read. **Mark unread** keeps it unread until
you leave that explanation. Theme, text size and narrative visibility are local.

Keyboard: `j/k` references, `h/l` stages, `J/K` threads, `g` final state, `n` narrative,
`d` diagrams/code, `t` history, `?` help. Buttons support the same actions on touch.
After one successful online load, the application shell and imported data can be
used offline. Browser eviction can still remove either cache. Close and reopen the
reader online to activate an available application update.

Physical iPad Files/GitSync selection still needs real-device acceptance; desktop
browser automation cannot prove it works.

## Docs index

See [docs/index.md](docs/index.md). The [MCP repository](https://github.com/bajor/raccoon-mcp)
owns the portable contract. `src/vendor/provenance.json` pins the generated copy.
