/**
 * Phase 5 - components prompt.
 *
 * The LLM takes a ProjectPlan plus the LLMContext and emits concrete
 * component instances with id/type/(x,y) coordinates. No wiring yet.
 */

import type { LLMContext } from '../context/types';
import { PromptBuilder } from './PromptBuilder';
import type { ProjectPlan } from '../planner/types';

export interface ComponentsPromptInput {
  context: LLMContext;
  plan: ProjectPlan;
}

export function buildComponentsPrompt(input: ComponentsPromptInput): { system: string; user: string } {
  const system = [
    PromptBuilder.preamble(),
    '',
    'You produce a ComponentInstance[] for the project. Each entry has',
    'id, type, x, y, and (optionally) properties. Use ONLY types that',
    'appear in the catalog block of the context.',
  ].join('\n');

  const user = [
    'Plan: ' + JSON.stringify(input.plan, null, 2),
    '',
    PromptBuilder.renderContext(input.context),
    '',
    'Output JSON shape:',
    '[',
    '  { "id": "...", "type": "...", "x": 100, "y": 100, "properties": { ... } }',
    ']',
  ].join('\n');

  return { system, user };
}
