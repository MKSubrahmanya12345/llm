/**
 * Phase 1 - Catalog access singleton.
 *
 * The whole LLM pipeline reads the catalog through this service. It is
 * initialized once at server startup; subsequent calls are O(1) memory
 * reads. JSON files are never re-read per request.
 *
 * If the catalog fails to load, init() throws and the server must fail
 * fast.
 */

import { CatalogLoader } from './CatalogLoader';
import type { ComponentMetadataEntry } from './types';

export class CatalogService {
  private static instance: CatalogService | null = null;
  private readonly byId: Map<string, ComponentMetadataEntry>;
  private readonly byTag: Map<string, ComponentMetadataEntry>;
  private readonly byCategory: Map<string, ComponentMetadataEntry[]>;
  private readonly allEntries: ComponentMetadataEntry[];

  private constructor(entries: ComponentMetadataEntry[]) {
    this.allEntries = entries;
    this.byId = new Map();
    this.byTag = new Map();
    this.byCategory = new Map();
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
      if (entry.tagName) this.byTag.set(entry.tagName, entry);
      const bucket = this.byCategory.get(entry.category) ?? [];
      bucket.push(entry);
      this.byCategory.set(entry.category, bucket);
    }
  }

  static init(opts?: { metadataPath?: string; overridesPath?: string }): CatalogService {
    if (CatalogService.instance) return CatalogService.instance;
    const loader = new CatalogLoader(opts);
    const entries = loader.load();
    CatalogService.instance = new CatalogService(entries);
    return CatalogService.instance;
  }

  static get(): CatalogService {
    if (!CatalogService.instance) {
      throw new Error(
        '[CatalogService] get() called before init() - call CatalogService.init() during server startup.'
      );
    }
    return CatalogService.instance;
  }

  /** Test/reset hook. */
  static resetForTests(): void {
    CatalogService.instance = null;
  }

  getCatalog(): ComponentMetadataEntry[] {
    return this.allEntries;
  }

  getComponent(id: string): ComponentMetadataEntry | undefined {
    return this.byId.get(id);
  }

  getComponentByTag(tag: string): ComponentMetadataEntry | undefined {
    return this.byTag.get(tag);
  }

  listComponents(): ComponentMetadataEntry[] {
    return this.allEntries;
  }

  listByCategory(category: string): ComponentMetadataEntry[] {
    return this.byCategory.get(category) ?? [];
  }

  /** Board metadata lives outside components-metadata; this helper keeps
   * the rest of the pipeline from having to know that. */
  getBoard(_boardId: string): ComponentMetadataEntry | undefined {
    return undefined;
  }
}
