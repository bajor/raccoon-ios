---
type: BDR
description: Read literal comparison endpoints and Python context without uploading source.
status: Implemented
---

# Comparison reading

Implements [requirements](/0006-split-diff-requirements.md) using the
[library decision](/0007-split-diff-decision.md).

```mermaid
flowchart LR
    Import[Verify local v2 assets] --> Endpoints[Resolve explicit endpoints]
    Endpoints --> Library[Pierre FileDiff or File]
    Library --> Article[Inline split diff or context]
    Cache[Precached local grammars] --> Library
```

1. Given a diff block, show both revisions inline, with revision/path captions.
2. Given added, deleted or existing empty files, retain the declared missing side.
3. Given Python context, render the authored range with actual file line numbers.
4. Given markup inside code, show literal source without execution or upload.
5. Given an offline reload, reopen comparisons using local source and syntax assets.

| Scenario | Level | Purpose |
|---|---|---|
| 1, 2, 4, 5 | Browser integration | Actual library rendering, safety and offline loading |
| 3 | Existing range browser integration | Context remains bounded after replacing pre rendering |

Acceptance: Chromium and supported-runner WebKit. Wide/narrow/print geometry is
the next implementation slice, not a claimed physical-device result.

## Amendment, 2026-10-22: exact Git line boundaries

Given source containing a lone carriage return, when displaying it, retain Git's
LF-delimited line numbers. Show an explicit control-escaped-source notice and
JSON-escape each LF-delimited line without enclosing quotes. Both diff endpoints
use the same reversible display encoding; their stored checksummed bytes remain
unchanged. This avoids a library convention that otherwise treats CR as a line
boundary. The browser regression verifies that reference `2-2` of `a\rb\nc\n`
displays `c`, not `b`.
