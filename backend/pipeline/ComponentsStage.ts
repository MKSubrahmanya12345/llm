// Component generation stage.
//
// Receives a ProjectPlan and emits typed `ComponentInstance[]` with
// concrete positions. The LLM is given the planned component list and
// the LLMContext; it just fills in the missing fields (id, x, y, props).
//
// Position layout is a simple horizontal row with the board first and
// peripherals after, computed as a hint for the LLM. The LLM is allowed
// to override.

import type { ComponentInstance } from '../types';
import { LlmClient, BedrockLlmClient } from '../planner/LlmClient';
import { LLMContext } from '../context/types';
import { buildComponentsPrompt } from '../prompts/components.prompt';
import { ProjectPlan } from '../planner/types';

export interface ComponentsStageOptions {
  llm?: LlmClient;
}

export class ComponentsStage {
  private readonly llm: LlmClient;
  constructor(opts: ComponentsStageOptions = {}) {
    this.llm = opts.llm ?? new BedrockLlmClient();
  }

  async run(plan: ProjectPlan, context: LLMContext): Promise<ComponentInstance[]> {
    const { system, user } = buildComponentsPrompt({ context, plan });
    const raw = await this.llm.chat(user, { system, temperature: 0.1, maxTokens: 1800 });
    return this.parse(raw, plan);
  }

  private parse(raw: string, plan: ProjectPlan): ComponentInstance[] {
    const arr = parseArray(raw);
    if (!arr.length && plan.components.length) {
      return this.fromPlan(plan);
    }
    return arr
      .filter((c) => c && typeof c === 'object')
      .map((c, idx) => {
        const id = String(c.id ?? `c${idx}`).trim();
        const type = String(c.type ?? '').trim();
        const x = Number(c.x ?? 100);
        const y = Number(c.y ?? 100);
        const properties = c.properties && typeof c.properties === 'object' ? c.properties : undefined;
        return { id, type, x, y, ...(properties ? { properties } : {}) } as ComponentInstance;
      })
      .filter((c) => c.id && c.type);
  }

  private fromPlan(plan: ProjectPlan): ComponentInstance[] {
    const colW = 160;
    return plan.components.map((c, idx) => ({
      id: c.id,
      type: c.type,
      x: 100 + (idx % 4) * colW,
      y: 100 + Math.floor(idx / 4) * colW,
    }));
  }
}

function parseArray(raw: string): any[] {
  try {
    const direct = JSON.parse(raw);
    if (Array.isArray(direct)) return direct;
  } catch {
    // fall through
  }
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      const v = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(v)) return v;
    } catch {
      // ignore
    }
  }
  return [];
}
