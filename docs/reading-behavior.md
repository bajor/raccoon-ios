---
type: BDR
description: Read current functional threads, optional history and exact files offline with local progress.
status: Superseded
superseded_by: "0004"
---

# Thread-first reading

This implements the approved [requirements](/requirements.md) within the
[client-only boundary](/decision.md).

Open an imported PR, then a thread's current explanation. History is optional and
ancestor-first. Selecting an ordered reference shows the complete historical file,
highlights its inclusive range and centers it in the source pane. Repeated references
remain separate navigation positions. A virtual source viewport keeps long files usable.

Each thread exposes its own diagram set, diagram revision and source references.
The bottom narrative can be hidden. Settings and reading progress are local. A
visible end marker marks the current explanation read; a manual unread control
suppresses automatic marking until the reader leaves that explanation.

## Scenarios and tests

| Given / when | Then | Instrument |
|---|---|---|
| Open a thread | Show final explanation and real file, not its first historical stage | Browser reading test |
| Select a historical stage/reference | Show its historical full file and range | Browser reading test |
| Navigate repeated references | Preserve ordered narrative positions | Browser navigation test |
| Reach the end of visible narrative | Persist that explanation's read marker | Browser progress test |
| Hide narrative | Keep code/diagram navigation usable | Browser keyboard test |
| Reload offline after application caching | Open cached artifacts and source without a backend | Browser offline test |
| Imported prose/source contains HTML | Display literal text without executing it | Browser security test |

Keyboard shortcuts: `j/k` references, `h/l` stages, `J/K` threads, `g` final state,
`n` narrative, `d` diagram/code, `t` history map, `?` help. Form fields retain native
keyboard behavior. On-screen controls provide the same actions without a keyboard.

## Acceptance scenarios

1. Given an imported thread, when opened, show its final explanation and complete
   referenced file. Historical stages remain optional and ancestor-first.
2. Given ordered references that repeat, when advancing, visit each occurrence.
3. Given a visible narrative, when its end is reached, persist that stage's read
   marker. A manual unread action suppresses automatic marking until leaving it.
4. Given cached application assets and an imported PR, when reopening offline,
   display the library, explanations and full source without backend requests.
5. Given HTML in imported prose or source, when displayed, treat it as literal text.

## Review amendment

Create the virtual file's full scroll extent before centering a deep initial
reference. Preserve narrative position when re-rendering the same explanation.
No-op thread selection does not leave an explanation or clear manual-unread
suppression. Concurrent PR opens supersede older pending opens, with exactly one
keyboard listener. Browser regressions cover each reproduced failure separately.

The narrative keeps its last visible scroll offset while hidden; hidden DOM scroll
values cannot overwrite that offset before the panel becomes visible again.
