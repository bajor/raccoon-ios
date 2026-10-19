---
type: PRD
description: Observable requirements for local learning artifacts on iPad.
status: Superseded
superseded_by: "0002"
---

# Local reading requirements

Import the selected artifact folder and cache it between visits. Open threads in
their final state; support optional historical stages, full files and diagram sets.
Highlight and center referenced source ranges. Provide a bottom narrative panel,
timeline, commit shortcuts, Vim-style keys and automatic read status.

| Quality scenario | Required response | Instrument |
|---|---|---|
| Corrupt or incomplete folder replaces a local snapshot | Reject without changing cached data | Browser import integration tests |
| Imported narrative, code or SVG contains executable content | Do not execute it or send private bytes | Browser security tests and static SVG allowlist |
| Regeneration changes one PR | Reset only that PR's progress | IndexedDB replacement tests |
| Safari Files selects the GitSync folder | Load the complete snapshot | Physical iPad acceptance, pending |

See [import behavior](/import-behavior.md) for the current implementation slice.
