---
type: PRD
description: Read horizontal code comparisons with Python-first syntax highlighting offline.
status: Accepted
---

# Split diff reading

Requested on 2026-10-22: show changes side-by-side, not sequential before/after
blocks. Preserve current code context, real line numbers and Python indentation.
Use an existing library, not copied diff or highlighting algorithms.

Requirements extend the [continuous article](/0002-article-requirements.md):
inline split comparisons, theme-aware syntax, unchanged-context expansion,
narrow-screen access, readable paper output and offline reopening. Source must
remain local and literal. Editing and code review remain outside scope.

Acceptance follows the [comparison behavior](/0008-split-diff-reading.md).
Real-device iPad and printer acceptance cannot be inferred from browser tests.
