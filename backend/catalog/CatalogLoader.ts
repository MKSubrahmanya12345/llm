/**
 * Phase 1 - Catalog loading.
 *
 * Loads components-metadata.json + component-overrides.json once at
 * server startup, normalizes them, and caches the result in memory.
 *
 * The rest of the LLM pipeline must consume the catalog only through
 * CatalogService. No code should read the JSON files directly.
 */

import { CatalogNormalizer } from './CatalogNormalizer';
import type { ComponentMetadataEntry } from './types';

export interface RawMetadataFile {
  version: string;
  components: Array<Record<string, unknown>>;
}

export type RawOverridesFile = Record<
  string,
  Record<string, unknown> & { $comment?: string }
>;

export class CatalogLoader {
  private readonly metadataPath: string;
  private readonly overridesPath: string;

  constructor(opts?: { metadataPath?: string; overridesPath?: string }) {
    this.metadataPath =
      opts?.metadataPath ??
      `${process.cwd()}/data/components-metadata.json`;
    this.overridesPath =
      opts?.overridesPath ??
      `${process.cwd()}/data/component-overrides.json`;
  }

  load(): ComponentMetadataEntry[] {
    const metadata = this.readJson<RawMetadataFile>(this.metadataPath, 'components-metadata.json');
    if (!metadata?.components || !Array.isArray(metadata.components)) {
      throw new Error(
        `[CatalogLoader] components-metadata.json is missing the "components" array (path: ${this.metadataPath})`
      );
    }

    let overrides: RawOverridesFile = {};
    try {
      overrides = this.readJson<RawOverridesFile>(this.overridesPath, 'component-overrides.json');
    } catch (err) {
      if (!this.isMissingFile(err)) throw err;
    }

    const normalizer = new CatalogNormalizer();
    return normalizer.normalize(metadata.components, overrides);
  }

  private readJson<T>(path: string, label: string): T {
    const fs = require('fs') as typeof import('fs');
    if (!fs.existsSync(path)) {
      throw new Error(`[CatalogLoader] ${label} not found at ${path}`);
    }
    const raw = fs.readFileSync(path, 'utf-8');
    try {
      return JSON.parse(raw) as T;
    } catch (err: any) {
      throw new Error(
        `[CatalogLoader] Failed to parse ${label} at ${path}: ${err?.message ?? err}`
      );
    }
  }

  private isMissingFile(err: unknown): boolean {
    const code = (err as { code?: string } | null)?.code;
    return code === 'ENOENT';
  }
}
