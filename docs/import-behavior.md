---
type: BDR
description: Verify a complete selected folder before replacing a repository's local data.
status: Implemented
---

# Import and replacement

The flow is folder selection, catalog and manifest validation, source checksums and
line counts, static SVG validation, then one IndexedDB transaction. A review SVG
accompanies the implementing PR. Selected folders are bounded to 200 MiB.

1. Given a complete folder, when imported, then it becomes available after reload.
2. Given a bad checksum or missing asset, when imported, then the prior cache remains.
3. Given an empty catalog, when imported, then that repository has no active PRs.
4. Given a changed generation, when imported, then only replaced or removed PR progress resets.
5. Given executable SVG content, when imported, then reject before storage.

## Test design

| Scenario | Level | Assertion and purpose |
|---|---|---|
| Complete folder | Browser integration | Reload preserves the imported repository |
| Invalid replacement | Browser integration | Previous PR remains after checksum failure |
| Empty catalog | Browser integration | Imported repository has no active artifacts |
| Per-generation progress | Browser integration | Preserve same-generation and other-PR keys |
| Active SVG | Browser integration | Script-bearing SVG never reaches the cache |

These are browser integration tests, not unit tests with mocked storage.

## Review amendment

Persistence requests are best effort and never delay input reset or change the
result of an already committed import. Tests await one synchronous browser-state
read from Node-side polling before deleting their selected-folder fixtures. This
avoids the WebKit asynchronous locator-assertion path without synthetic uploads,
retries, longer timeouts or reduced coverage. CI retains failure traces for diagnosis.
