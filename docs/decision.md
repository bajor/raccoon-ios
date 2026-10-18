---
type: ADR
description: A static web application imports local snapshots instead of owning Git or synchronization.
status: Accepted
---

# Client-only import

The user selected GitHub Pages and manual folder imports rather than native iOS
and TestFlight. The reader does not implement GitSync integration or use a reader
backend. iPad Safari does not provide persistent external directory handles; a
Home Screen installation does not remove that limit. Re-import is explicit.

MCP owns the artifact contract. A generated source copy pins the exact producer
revision so neither side silently changes the format. Unsupported formats fail.

The physical Files selection remains an acceptance gate, not something desktop
emulation can establish. See [requirements](/requirements.md).
