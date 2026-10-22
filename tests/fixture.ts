import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Artifact } from '../src/vendor/contract';

export const generation = '71defc62-8b6b-4f81-80ce-c7ed4b639df7';
export const replacement = '0373f679-cc27-41d5-baf6-6c967b9fbd94';
const commit = 'a'.repeat(40);
const digest = (data: string): string => createHash('sha256').update(data).digest('hex');
const source = 'export function handler() {\n  return "<script>window.leaked = true</script>";\n}\n';
const olderSource = 'old handler\nold context\n';
export const pythonSource = 'from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Frame:\n    score: float\n\ndef accepted(frame: Frame, threshold: float) -> bool:\n    """Keep <script>window.leaked = true</script> literal."""\n    return frame.score >= threshold\n';
const pythonBefore = pythonSource.replace('frozen=True', 'frozen=False').replace('>= threshold', '> threshold');
type Comparison = 'modified' | 'added' | 'deleted' | 'empty';
const longSource = Array.from({ length: 1000 }, (_, index) => `handler line ${index + 1}\n`).join('');
const svg = (width: number, height: number): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#fff"/><text x="20" y="50" fill="#000">Handler</text></svg>`;
const landscape = svg(900, 240);
const portrait = svg(240, 900);

export function manifest(pr = 1, snapshot = generation, diagram?: string, long = false, twoChapters = false, comparison?: Comparison): Artifact {
  const text = comparison ? pythonSource : long ? longSource : source;
  const before = comparison ? pythonBefore : olderSource;
  const result: Artifact = {
    version: 2, generation: snapshot, createdAt: '2026-10-18T00:00:00Z', profileHash: 'b'.repeat(64),
    source: { repository: 'bajor/example', pr, title: `Handler ${pr}`, branch: 'feature', baseSha: '0'.repeat(40), mergeBaseSha: '0'.repeat(40), headSha: commit },
    commits: [{ sha: '0'.repeat(40), subject: 'Existing handler', parents: [], phase: 'before-pr' },
      { sha: commit, subject: 'Add handler', parents: ['0'.repeat(40)], phase: 'pr' }],
    changes: [{ id: 'c1', commit, path: 'src/main.ts', status: 'added' }],
    excludedCommits: [],
    content: {
      language: 'en', title: `Handler ${pr}`, introduction: 'Follow the complete request, its source and its history in one article.',
      historyNote: 'Available relevant history inspected.',
      references: [{ id: 'r1', commit, path: 'src/main.ts', startLine: long ? 500 : 1, endLine: long ? 503 : 2 },
        { id: 'r0', commit: '0'.repeat(40), path: 'src/main.ts', startLine: 1, endLine: 1 }],
      assignments: [{ change: 'c1', chapter: 'flow' }],
      chapters: [{ id: 'flow', title: 'Request flow', summary: 'Connect the handler to its caller.',
        sections: [{ commit, title: 'How the request works', blocks: [
          { kind: 'prose', text: 'The handler accepts a request. <img src=x onerror="window.leaked=true">'.repeat(long ? 80 : 1), evidence: 'fact', refs: ['r1'] },
          { kind: 'code', reference: 'r1' },
          { kind: 'prose', text: 'The same handler is used again.', evidence: 'fact', refs: ['r1'] },
          { kind: 'code', reference: 'r1' }, { kind: 'diagram', diagram: 'request' },
        ] }, { commit: '0'.repeat(40), title: 'The original handler', blocks: [
          { kind: 'prose', text: 'The original caller uses this handler.', evidence: 'fact', refs: ['r0'] }, { kind: 'code', reference: 'r0' },
        ] }, { commit, title: 'Adding the handler', blocks: [
          { kind: 'prose', text: 'Introduce the handler.', evidence: 'fact', refs: ['r1'] }, { kind: 'code', reference: 'r1' },
        ] }],
        diagrams: [{ id: 'request', title: 'Request path', commit, nodes: [{ id: 'handler', label: 'Handler', refs: ['r1'] }], edges: [] }],
      }],
    },
    files: [{ reference: 'r1', blob: commit, sha256: digest(text), file: `files/${digest(text)}.txt`, bytes: Buffer.byteLength(text), lines: comparison ? 9 : long ? 1000 : 3 },
      { reference: 'r0', blob: 'c'.repeat(40), sha256: digest(before), file: `files/${digest(before)}.txt`, bytes: Buffer.byteLength(before), lines: comparison ? 9 : 2 }],
    diagrams: (['landscape', 'portrait'] as const).map((layout) => ({ chapter: 'flow', diagram: 'request', layout,
      file: `diagrams/flow/request-${layout}.svg`, sha256: digest(diagram ?? (layout === 'landscape' ? landscape : portrait)),
      width: layout === 'landscape' ? 900 : 240, height: layout === 'landscape' ? 240 : 900 })),
  };
  if (comparison) {
    result.content.references[0] = { ...result.content.references[0]!, path: 'pipeline.py', startLine: 3, endLine: 9 };
    result.content.references[1]!.path = comparison === 'added' ? 'context.py' : 'pipeline.py';
    if (comparison === 'deleted') result.content.references[0]!.path = 'context.py';
    result.changes[0] = { ...result.changes[0]!, path: 'pipeline.py', status: comparison === 'empty' ? 'added' : comparison };
    const block = { kind: 'diff' as const, before: comparison === 'modified' || comparison === 'deleted' ? 'r0' : null,
      after: comparison === 'deleted' ? null : comparison === 'empty' ? 'empty' : 'r1' };
    if (comparison === 'empty') {
      result.changes[0]!.path = 'empty.py';
      result.content.references.push({ id: 'empty', commit, path: 'empty.py', startLine: 0, endLine: 0 });
      result.files.push({ reference: 'empty', blob: 'e'.repeat(40), sha256: digest(''), file: `files/${digest('')}.txt`, bytes: 0, lines: 0 });
    }
    result.content.chapters[0]!.sections[0]!.blocks.push(block);
  }
  if (twoChapters) {
    const chapter = structuredClone(result.content.chapters[0]!); chapter.id = 'response'; chapter.title = 'Response formatting';
    result.content.chapters.push(chapter);
    result.changes.push({ id: 'c2', commit, path: 'src/response.ts', status: 'added' });
    result.content.assignments.push({ change: 'c2', chapter: 'response' });
    result.diagrams.push(...result.diagrams.map((asset) => ({ ...asset, chapter: 'response', file: asset.file.replace('/flow/', '/response/') })));
  }
  return result;
}

export async function folder(options: { empty?: boolean; snapshot?: string; diagram?: string; corrupt?: boolean; missing?: boolean; twoPrs?: boolean; long?: boolean; twoChapters?: boolean; version?: number; viewportMismatch?: boolean; comparison?: Comparison } = {}): Promise<string> {
  const root = join(await mkdtemp(join(tmpdir(), 'raccoon-browser-')), 'raccoon-artifacts');
  await mkdir(root);
  const manifests = options.empty ? [] : [manifest(1, options.snapshot ?? generation, options.diagram, options.long, options.twoChapters, options.comparison)];
  if (options.twoPrs) manifests.push(manifest(2));
  await writeFile(join(root, 'catalog.json'), JSON.stringify({ version: options.version ?? 2, repository: 'bajor/example',
    artifacts: manifests.map((item) => ({ pr: item.source.pr, manifest: `pr-${item.source.pr}/manifest.json` })) }));
  for (const item of manifests) {
    const directory = join(root, `pr-${item.source.pr}`);
    await mkdir(join(directory, 'files'), { recursive: true });
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(item));
    if (!options.missing) await writeFile(join(directory, item.files[0]!.file), options.corrupt ? 'tampered\n' : options.comparison ? pythonSource : options.long && item.source.pr === 1 ? longSource : source);
    await writeFile(join(directory, item.files[1]!.file), options.comparison ? pythonBefore : olderSource);
    if (options.comparison === 'empty') await writeFile(join(directory, item.files[2]!.file), '');
    for (const asset of item.diagrams) {
      await mkdir(join(directory, 'diagrams', asset.chapter), { recursive: true });
      let data = options.diagram ?? (asset.layout === 'landscape' ? landscape : portrait);
      if (options.viewportMismatch) data = data.replace(/viewBox="[^"]+"/, 'viewBox="0 0 100 100"');
      await writeFile(join(directory, asset.file), data);
      if (options.viewportMismatch) asset.sha256 = digest(data);
    }
    if (options.viewportMismatch) await writeFile(join(directory, 'manifest.json'), JSON.stringify(item));
  }
  return root;
}
