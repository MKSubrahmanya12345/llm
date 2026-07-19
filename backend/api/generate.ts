// Velxio generation API entry point.
//
// All heavy lifting now lives in `pipeline/Pipeline.ts`. This file is a
// thin adapter: build a Pipeline, call run(), translate progress events
// for the HTTP client, and persist `latest_project.json` for inspection.

import { Pipeline, ProgressEvent } from '../pipeline';
import type { VelxioProject } from '../types';

export type OnProgress = (evt: ProgressEvent) => void;

export interface GenerateResult {
  project: VelxioProject;
  validationErrors: string[];
  stages: string[];
}

export async function generateVelxioProject(
  userPrompt: string,
  onProgress: OnProgress,
  _maxRetries: number = 1,
): Promise<VelxioProject> {
  const pipeline = new Pipeline();
  const result = await pipeline.run(userPrompt, onProgress);
  persist(result.project);
  return result.project;
}

export interface ValidationError {
  type: string;
  instanceId?: string;
  pin?: string;
  fix: string;
}

export async function validateProject(
  project: VelxioProject,
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const { validateProject: validate } = await import('../validators-core');
  const res = validate(project);
  const errors: ValidationError[] = res.errors.map((e) => ({
    type: e.type,
    instanceId: e.instanceId,
    pin: e.pin,
    fix: e.fix,
  }));
  return { valid: res.valid, errors };
}

export let latestProject: VelxioProject | null = loadPersisted();

function loadPersisted(): VelxioProject | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    if (fs.existsSync('latest_project.json')) {
      return JSON.parse(fs.readFileSync('latest_project.json', 'utf-8'));
    }
  } catch {
    // Ignore
  }
  return null;
}

function persist(project: VelxioProject): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    fs.writeFileSync('latest_project.json', JSON.stringify(project, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write latest_project.json:', err);
  }
}
