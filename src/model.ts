import type { Artifact } from './vendor/contract';

export interface ImportedArtifact {
  manifest: Artifact;
  assets: Map<string, ArrayBuffer>;
}
export interface Library {
  repository: string;
  artifacts: ImportedArtifact[];
}
export const progressKey = (repository: string, pr: number, generation: string, thread: string, stage: string): string =>
  JSON.stringify([repository.toLowerCase(), pr, generation, thread, stage]);
