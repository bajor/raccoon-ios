import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const [repository, revision] = process.argv.slice(2);
if (!repository || !/^[a-f0-9]{40,64}$/.test(revision ?? '')) {
  throw new Error('Usage: node scripts/sync-contract.mjs /path/to/raccoon-mcp FULL_SHA');
}
const source = execFileSync('git', ['-C', repository, 'show', `${revision}:src/contract.ts`], { encoding: 'utf8' });
await mkdir('src/vendor', { recursive: true });
await writeFile('src/vendor/contract.ts', `// Generated from bajor/raccoon-mcp@${revision}. Do not edit.\n${source}`);
await writeFile('src/vendor/provenance.json', JSON.stringify({ repository: 'bajor/raccoon-mcp', revision, path: 'src/contract.ts' }, null, 2) + '\n');
