/**
 * Phase 2 - Component context.
 *
 * Wraps a `ComponentMetadataEntry` into a `ComponentSummary` and
 * searches the catalog for components that match a free-text prompt.
 * The LLM only ever sees the summarised shape, never the raw JSON.
 */

import type { ComponentMetadataEntry } from '../catalog/types';
import { CatalogService } from '../catalog/CatalogService';
import { toComponentSummary, type ComponentSummary } from './types';

export class ComponentContext {
  static forType(type: string): ComponentSummary | undefined {
    const entry = CatalogService.get().getComponent(type);
    if (!entry) return undefined;
    return toComponentSummary(entry);
  }

  static forTypes(types: string[]): ComponentSummary[] {
    return types
      .map((t) => ComponentContext.forType(t))
      .filter((s): s is ComponentSummary => Boolean(s));
  }

  /** All components that look relevant for a free-text prompt. */
  static searchByPrompt(prompt: string, maxResults = 20): ComponentSummary[] {
    const lower = prompt.toLowerCase();
    const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    const scored: Array<{ entry: ComponentMetadataEntry; score: number }> = [];
    for (const entry of CatalogService.get().getCatalog()) {
      let score = 0;
      for (const tag of entry.tags) {
        if (lower.includes(tag.toLowerCase())) score += 2;
      }
      if (lower.includes(entry.name.toLowerCase())) score += 3;
      if (lower.includes(entry.id.toLowerCase())) score += 2;
      for (const token of tokens) {
        if (token.length < 3) continue;
        if (entry.tags.some((t) => t.toLowerCase().includes(token))) score += 1;
        if (entry.name.toLowerCase().includes(token)) score += 1;
      }
      if (score > 0) scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((s) => toComponentSummary(s.entry));
  }
}
