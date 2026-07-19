// Planner — first stage of the generation pipeline.
//
// Responsibility: take a user prompt + a small LLMContext, return a
// ProjectPlan describing the chosen board, protocols, libraries, and a
// rough component list.
//
// It does NOT:
//   - choose GPIO pins (PinAllocator's job, Phase 8)
//   - emit final wiring (Connections stage, Phase 5)
//   - emit firmware (Firmware stage, Phase 9)

import { ContextBuilder } from '../context/ContextBuilder';
import { LLMContext } from '../context/types';
import { buildPlanPrompt } from '../prompts/plan.prompt';
import { BedrockLlmClient, LlmClient } from './LlmClient';
import { BoardId, ProjectPlan, ProtocolId } from './types';

const VALID_BOARDS: BoardId[] = [
  'arduino-uno',
  'arduino-nano',
  'arduino-mega',
  'esp32-devkit-c',
  'raspberry-pi-pico',
];

const VALID_PROTOCOLS: ProtocolId[] = ['i2c', 'spi', 'uart', 'pwm', 'onewire', 'analog'];

export interface PlannerOptions {
  llm?: LlmClient;
  /** Optional override; mostly useful for tests. */
  detectBoard?: (ctx: LLMContext, intent: string) => BoardId;
}

export class Planner {
  private readonly llm: LlmClient;
  private readonly detectBoardOverride?: (ctx: LLMContext, intent: string) => BoardId;

  constructor(opts: PlannerOptions = {}) {
    this.llm = opts.llm ?? new BedrockLlmClient();
    this.detectBoardOverride = opts.detectBoard;
  }

  async plan(prompt: string): Promise<ProjectPlan> {
    const context = ContextBuilder.build(prompt);
    const { system, user } = buildPlanPrompt({ context });
    const raw = await this.llm.chat(user, { system, temperature: 0.1, maxTokens: 1500 });
    const parsed = this.parsePlan(raw, context, prompt);
    return this.normalise(parsed, prompt, context);
  }

  private parsePlan(raw: string, _ctx: LLMContext, prompt: string): Partial<ProjectPlan> {
    // Try strict JSON first, then fall back to the first {...} block.
    const tryParse = (txt: string): Partial<ProjectPlan> | null => {
      try {
        const j = JSON.parse(txt);
        if (j && typeof j === 'object') return j as Partial<ProjectPlan>;
      } catch {
        // ignore
      }
      return null;
    };

    const direct = tryParse(raw);
    if (direct) return direct;

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const sliced = tryParse(raw.slice(start, end + 1));
      if (sliced) return sliced;
    }

    // Last resort: empty plan, will be filled by normalise()
    void prompt;
    return {};
  }

  private normalise(
    raw: Partial<ProjectPlan>,
    prompt: string,
    context: LLMContext,
  ): ProjectPlan {
    const intent = (raw.intent ?? prompt).trim();
    const board =
      this.coerceBoard(raw.board) ??
      this.detectBoardOverride?.(context, intent) ??
      (context.board.id as BoardId);
    const requiredProtocols = this.coerceProtocols(raw.requiredProtocols);
    const requiredLibraries = Array.isArray(raw.requiredLibraries)
      ? raw.requiredLibraries
          .filter((l) => l && typeof l === 'object')
          .map((l) => ({ name: String(l.name ?? ''), reason: String(l.reason ?? '') }))
          .filter((l) => l.name.length > 0)
      : [];
    const components = Array.isArray(raw.components)
      ? raw.components
          .filter((c) => c && typeof c === 'object')
          .map((c) => ({
            id: String(c.id ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || `c${Math.random().toString(36).slice(2, 7)}`,
            type: String(c.type ?? ''),
            reason: String(c.reason ?? ''),
          }))
          .filter((c) => c.type.length > 0)
      : [];
    const reasoning = String(raw.reasoning ?? '').trim();
    return { intent, board, requiredProtocols, requiredLibraries, components, reasoning };
  }

  private coerceBoard(value: unknown): BoardId | null {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    if ((VALID_BOARDS as string[]).includes(v)) return v as BoardId;
    // common aliases
    if (v === 'uno') return 'arduino-uno';
    if (v === 'nano') return 'arduino-nano';
    if (v === 'mega' || v === 'mega2560') return 'arduino-mega';
    if (v === 'esp32' || v === 'esp32-devkit') return 'esp32-devkit-c';
    if (v === 'pico' || v === 'rp2040') return 'raspberry-pi-pico';
    return null;
  }

  private coerceProtocols(value: unknown): ProtocolId[] {
    if (!Array.isArray(value)) return [];
    const out = new Set<ProtocolId>();
    for (const item of value) {
      if (typeof item !== 'string') continue;
      const v = item.trim().toLowerCase();
      if ((VALID_PROTOCOLS as string[]).includes(v)) out.add(v as ProtocolId);
    }
    return [...out];
  }
}
