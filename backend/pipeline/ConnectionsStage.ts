// Connection generation stage.
//
// Receives the planned components and emits `ConnectionSchema[]`. The
// LLM is told the board, the catalogued pin list, and any planned
// protocols. It must produce a complete wiring that powers everything
// and avoids pin collisions.

import type { ComponentInstance, ConnectionSchema } from '../types';
import { LlmClient, BedrockLlmClient } from '../planner/LlmClient';
import { LLMContext } from '../context/types';
import { buildConnectionsPrompt } from '../prompts/connections.prompt';
import { ProjectPlan } from '../planner/types';

export interface ConnectionsStageOptions {
  llm?: LlmClient;
}

export class ConnectionsStage {
  private readonly llm: LlmClient;
  constructor(opts: ConnectionsStageOptions = {}) {
    this.llm = opts.llm ?? new BedrockLlmClient();
  }

  async run(
    plan: ProjectPlan,
    components: ComponentInstance[],
    context: LLMContext,
  ): Promise<ConnectionSchema[]> {
    const { system, user } = buildConnectionsPrompt({ context, plan, components });
    const raw = await this.llm.chat(user, { system, temperature: 0.1, maxTokens: 2500 });
    return this.parse(raw);
  }

  private parse(raw: string): ConnectionSchema[] {
    const arr = parseArray(raw);
    return arr
      .filter((c) => c && typeof c === 'object')
      .map((c) => {
        const from = String(c.from ?? '').trim();
        const to = String(c.to ?? '').trim();
        const color = typeof c.color === 'string' ? c.color : undefined;
        return color ? { from, to, color } : { from, to };
      })
      .filter((c) => c.from.includes(':') && c.to.includes(':'));
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
