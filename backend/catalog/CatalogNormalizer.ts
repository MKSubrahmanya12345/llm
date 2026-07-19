/**
 * Normalize a single entry coming from either the metadata file or an
 * override file into the canonical internal shape consumed by the rest
 * of the LLM pipeline.
 *
 * Override file keys are component IDs; values are partial patch
 * objects whose top-level fields (properties, defaultValues, tags,
 * name, pinCount, etc.) replace or extend the metadata entry.
 */

import type { ComponentMetadataEntry, ComponentPin } from './types';

export class CatalogNormalizer {
  normalize(
    rawMetadata: Array<Record<string, unknown>>,
    rawOverrides: RawOverridesFileLike
  ): ComponentMetadataEntry[] {
    const byId = new Map<string, ComponentMetadataEntry>();

    for (const raw of rawMetadata) {
      const entry = this.fromMetadata(raw);
      if (!entry) continue;
      byId.set(entry.id, entry);
    }

    for (const [id, patchRaw] of Object.entries(rawOverrides)) {
      if (!patchRaw || patchRaw.$comment) continue; // pure-comment entries
      const existing = byId.get(id);
      const merged = this.applyPatch(existing, patchRaw, id);
      byId.set(id, merged);
    }

    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  private fromMetadata(raw: Record<string, unknown>): ComponentMetadataEntry | null {
    const id = this.readString(raw, 'id');
    if (!id) return null;
    const pinsRaw = raw['pins'];
    const pins = Array.isArray(pinsRaw) ? pinsRaw.filter((p): p is ComponentPin =>
      p != null && typeof p === 'object' && 'name' in p
    ) : [];
    return {
      id,
      tagName: this.readString(raw, 'tagName'),
      name: this.readString(raw, 'name') ?? id,
      category: this.readString(raw, 'category') ?? 'uncategorized',
      description: this.readString(raw, 'description') ?? '',
      pinCount: this.readNumber(raw, 'pinCount') ?? pins.length,
      pins,
      tags: this.readStringArray(raw, 'tags') ?? [],
      properties: this.readRecord(raw, 'properties') ?? {},
      defaultValues: this.readRecord(raw, 'defaultValues') ?? {},
      protocol: this.readString(raw, 'protocol'),
      voltage: this.readString(raw, 'voltage'),
      source: 'metadata',
    };
  }

  private applyPatch(
    existing: ComponentMetadataEntry | undefined,
    patch: Record<string, unknown>,
    id: string
  ): ComponentMetadataEntry {
    const base: ComponentMetadataEntry = existing ?? {
      id,
      name: id,
      category: 'uncategorized',
      description: '',
      pinCount: 0,
      pins: [],
      tags: [],
      properties: {},
      defaultValues: {},
      source: 'override',
    };
    return {
      ...base,
      id,
      name: this.readString(patch, 'name') ?? base.name,
      category: this.readString(patch, 'category') ?? base.category,
      description: this.readString(patch, 'description') ?? base.description,
      pinCount: this.readNumber(patch, 'pinCount') ?? base.pinCount,
      tags: this.readStringArray(patch, 'tags') ?? base.tags,
      properties: this.mergeRecord(base.properties, this.readRecord(patch, 'properties')),
      defaultValues: this.mergeRecord(
        base.defaultValues,
        this.readRecord(patch, 'defaultValues')
      ),
      protocol: this.readString(patch, 'protocol') ?? base.protocol,
      voltage: this.readString(patch, 'voltage') ?? base.voltage,
      source: 'override',
    };
  }

  private readString(raw: Record<string, unknown>, key: string): string | undefined {
    const v = raw[key];
    return typeof v === 'string' ? v : undefined;
  }

  private readNumber(raw: Record<string, unknown>, key: string): number | undefined {
    const v = raw[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  }

  private readStringArray(
    raw: Record<string, unknown>,
    key: string
  ): string[] | undefined {
    const v = raw[key];
    if (!Array.isArray(v)) return undefined;
    return v.filter((x): x is string => typeof x === 'string');
  }

  private readRecord(
    raw: Record<string, unknown>,
    key: string
  ): Record<string, unknown> | undefined {
    const v = raw[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return undefined;
  }

  private mergeRecord(
    base: Record<string, unknown>,
    patch: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    if (!patch) return base;
    return { ...base, ...patch };
  }
}

type RawOverridesFileLike = Record<
  string,
  Record<string, unknown> & { $comment?: string }
>;
