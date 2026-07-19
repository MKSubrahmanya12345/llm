/**
 * Phase 5 - connections prompt.
 *
 * The LLM receives the chosen component instances, the plan, and the
 * context (board pin tables, protocol buckets) and emits a list of
 * connections in the form "instanceId:pin" -> "instanceId:pin".
 *
 * The pin allocator (Phase 8) will rewrite any LLM-supplied GPIO
 * choices to safe values; for now the LLM picks pins itself.
 */

import type { LLMContext } from '../context/types';
import { PromptBuilder } from './PromptBuilder';
import type { ComponentInstance } from '../types';
import type { ProjectPlan } from '../planner/types';

export interface ConnectionsPromptInput {
  context: LLMContext;
  plan: ProjectPlan;
  components: ComponentInstance[];
}

export function buildConnectionsPrompt(input: ConnectionsPromptInput): { system: string; user: string } {
  const system = [
    PromptBuilder.preamble(),
    '',
    'You produce a list of connections between component instances.',
    'Each connection is "fromInstance:pin" -> "toInstance:pin".',
    'Use only pins that exist on the component (see context).',
    'Use board pin names from context.board.gpio / i2c / spi / uart.',
  ].join('\n');

  const user = [
    'Plan: ' + JSON.stringify(input.plan, null, 2),
    '',
    'Components:',
    JSON.stringify(input.components, null, 2),
    '',
    PromptBuilder.renderContext(input.context),
    '',
    'Output JSON shape:',
    '[',
    '  { "from": "instanceId:pinName", "to": "instanceId:pinName" }',
    ']',
  ].join('\n');

  return { system, user };
}
