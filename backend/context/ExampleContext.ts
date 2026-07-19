/**
 * Phase 2 - Example context.
 *
 * Returns only the few most relevant example projects for a prompt.
 * The LLM should never see the entire `examples.ts` file; it should
 * see two or three short summaries that match what the user asked for.
 *
 * The list of examples lives in `data/examples.json` (Phase 2
 * snapshot). The relevance scoring is intentionally simple so the
 * behaviour is easy to explain.
 */

import type { ExampleSummary } from './types';

interface ExampleEntry extends ExampleSummary {
  board?: string;
  components?: string[];
}

let examples: ExampleEntry[] | null = null;

function loadExamples(): ExampleEntry[] {
  if (examples) return examples;
  const fs = require('fs') as typeof import('fs');
  const path = `${process.cwd()}/data/examples.json`;
  if (!fs.existsSync(path)) {
    examples = [];
    return examples;
  }
  try {
    examples = JSON.parse(fs.readFileSync(path, 'utf-8')) as ExampleEntry[];
  } catch {
    examples = [];
  }
  return examples;
}

export class ExampleContext {
  static forPrompt(prompt: string, maxResults = 3): ExampleSummary[] {
    const lower = prompt.toLowerCase();
    const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    const all = loadExamples();
    const scored = all.map((ex) => {
      let score = 0;
      for (const tag of ex.tags) {
        if (lower.includes(tag.toLowerCase())) score += 3;
      }
      if (lower.includes(ex.name.toLowerCase())) score += 4;
      for (const token of tokens) {
        if (token.length < 3) continue;
        if (ex.tags.some((t) => t.toLowerCase().includes(token))) score += 1;
        if (ex.name.toLowerCase().includes(token)) score += 2;
      }
      return { ex, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => ({ id: s.ex.id, name: s.ex.name, summary: s.ex.summary, tags: s.ex.tags }));
  }
}
