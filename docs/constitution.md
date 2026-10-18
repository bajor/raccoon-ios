---
type: Constitution
description: The approved client-only, thread-first Raccoon reader scope.
status: Ratified
---

# Reader constitution

Help a human understand agent-written PRs from complete local artifacts. Threads
are the primary navigation; current state opens first and history is optional.
Git is the source of every displayed file. Source is never uploaded by the reader.

GitSync owns synchronization and branch selection outside this application. The
user manually imports snapshots from Files. Settings, imports and progress stay
on the client. A failed import preserves the previous local snapshot. Regeneration
resets that PR's reading progress, not other PRs or settings.

Editing, reviewing, merging, PR discovery, an embedded chatbot and a native iOS app
are outside scope. The user approved this boundary on 2026-10-18.
