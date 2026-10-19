---
type: PRD
description: Continuous English reading with inline evidence, focus and paper output.
status: Accepted
supersedes: requirements
---

# Book-like article reading

The user approved this direction on 2026-10-19 and explicitly removed backward
compatibility from scope. This supersedes [workspace requirements](/requirements.md).

1. Import/select an English article, adjust text size, then press Read to hide app controls.
2. Display one continuous article: title, introduction, contents and functional chapters.
3. Preserve authored prose/code/diagram order. Display exact referenced Git excerpts
   inline and history as ordinary sections. Do not provide separate code or history panes.
4. Open inline diagrams in a screen-filling dialog. Automatically choose the layout
   with the largest fitted scale, including after screen rotation. No manual zoom.
5. Print the complete article, readable wrapped code and page-fitted diagrams without controls.
6. Preserve local-only import, transactional replacement, external GitSync and offline access.
7. Accept version 2 only. Do not migrate old packages or old reading state.

| Quality scenario | Required response | Instrument |
|---|---|---|
| Imported prose or code contains markup | Literal text, no execution or upload | Browser security scenario |
| Portrait, landscape or print | Complete excerpts and fitted diagrams, no horizontal panning | Browser geometry and print smoke |
| Failed replacement | Preserve the valid cache | Import integration scenarios |
| Safari Files/GitSync selection | Import and read on physical iPad | Pending physical-device acceptance |

Acceptance follows [article behavior](/0004-article-reading.md). Desktop WebKit
emulation does not establish physical Files selection or paper-printer behavior.
