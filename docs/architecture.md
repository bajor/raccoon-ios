---
type: Architecture View
description: Local import validation and storage ownership.
---

# Architecture

`src/import.ts` validates a complete folder using the generated portable contract
in `src/vendor/`. It verifies SHA-256, UTF-8 source, real line counts and byte
counts. `src/svg.ts` permits static SVG elements and attributes only, with no
scripts, links, external resources, embedded HTML, stylesheets or animation.

`src/storage.ts` owns IndexedDB repository snapshots and read markers. It starts
the replacement transaction only after all file validation completes. A repository
catalog is authoritative for that repository, never for other repositories.

`src/main.ts` owns selection and import feedback. `src/dom.ts` creates text-only
DOM elements. The static host serves the application, not private artifacts.
No runtime library calls a network API with imported content. A restrictive
Content Security Policy is defense in depth, not a substitute for safe rendering.

Per global policy, Mermaid review diagrams are rendered outside the repository;
only temporary review SVGs live under `visual-explanations/` and are deleted from
`main` after merge. Permanent docs retain these ownership descriptions.
