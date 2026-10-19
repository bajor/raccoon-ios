---
type: ADR
description: Replace the workspace with a static article and responsive static diagram assets.
status: Accepted
---

# One article, no workspace adapter

## Context

The user chose uninterrupted reading rather than a source-navigation workspace,
and explicitly requested removal of compatibility code. Generated HTML was offered
as an alternative to structured articles but adds a second executable-content boundary.

## Decision

Vendor the producer's version-2 contract. Render ordered blocks as literal DOM text,
exact excerpts and image-only SVG figures. Use native document scrolling, anchor
contents and a modal diagram dialog. Choose between producer-supplied layouts by
their fitted scale. Use print CSS and a dedicated fitted print image.

Remove virtual full-file viewing, reference cursors, timelines and manual zoom.
Read mode hides controls; a page tap reveals the exit button and Escape exits.
Use a new `raccoon-articles` IndexedDB database, without migrating or deleting old
browser data. Settings remain local. New article imports replace only new article data.

## Consequences

There is one reading model and no client layout engine or new runtime dependency.
Older artifacts need removal/regeneration outside this reader. Existing old local
data is untouched but cannot open in the new application. Browser tests verify
focus, inline order, fitted dialogs, printing, offline access and untrusted text.
