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
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="#22313c"/><text x="10" y="50" fill="#fff">Handler</text></svg>';

export function manifest(pr = 1, snapshot = generation, diagram = svg): Artifact {
  return {
    version: 1, generation: snapshot, createdAt: '2026-10-18T00:00:00Z', profileHash: 'b'.repeat(64),
    source: { repository: 'bajor/example', pr, title: `Handler ${pr}`, branch: 'feature', baseSha: '0'.repeat(40), mergeBaseSha: '0'.repeat(40), headSha: commit },
    commits: [{ sha: commit, subject: 'Add handler', parents: ['0'.repeat(40)], phase: 'pr' }],
    changes: [{ id: 'c1', commit, path: 'src/main.ts', status: 'added' }],
    excludedCommits: [],
    content: {
      historyNote: 'Available relevant history inspected.',
      references: [{ id: 'r1', commit, path: 'src/main.ts', startLine: 1, endLine: 2 }],
      assignments: [{ change: 'c1', thread: 'flow' }],
      threads: [{ id: 'flow', title: 'Request flow', summary: 'Connect the handler to its caller.',
        current: [{ text: 'The handler accepts a request.', evidence: 'fact', refs: ['r1'] }],
        stages: [{ commit, title: 'Add handler', blocks: [{ text: 'Introduce the handler.', evidence: 'fact', refs: ['r1'] }] }],
        diagrams: [{ id: 'request', title: 'Request path', commit, nodes: [{ id: 'handler', label: 'Handler', refs: ['r1'] }], edges: [] }],
      }],
    },
    files: [{ reference: 'r1', blob: commit, sha256: digest(source), file: `files/${digest(source)}.txt`, bytes: Buffer.byteLength(source), lines: 3 }],
    diagrams: [{ thread: 'flow', diagram: 'request', file: 'diagrams/flow/request.svg', sha256: digest(diagram) }],
  };
}

export async function folder(options: { empty?: boolean; snapshot?: string; diagram?: string; corrupt?: boolean; missing?: boolean; twoPrs?: boolean } = {}): Promise<string> {
  const root = join(await mkdtemp(join(tmpdir(), 'raccoon-browser-')), 'raccoon-artifacts');
  await mkdir(root);
  const manifests = options.empty ? [] : [manifest(1, options.snapshot ?? generation, options.diagram ?? svg)];
  if (options.twoPrs) manifests.push(manifest(2));
  await writeFile(join(root, 'catalog.json'), JSON.stringify({ version: 1, repository: 'bajor/example',
    artifacts: manifests.map((item) => ({ pr: item.source.pr, manifest: `pr-${item.source.pr}/manifest.json` })) }));
  for (const item of manifests) {
    const directory = join(root, `pr-${item.source.pr}`);
    await mkdir(join(directory, 'files'), { recursive: true });
    await mkdir(join(directory, 'diagrams/flow'), { recursive: true });
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(item));
    if (!options.missing) await writeFile(join(directory, item.files[0]!.file), options.corrupt ? 'tampered\n' : source);
    await writeFile(join(directory, item.diagrams[0]!.file), options.diagram ?? svg);
  }
  return root;
}
