/**
 * Phase 7 - libraries prompt.
 *
 * The library resolver (Phase 7) does most of this work; the LLM is
 * only consulted if the chosen components need libraries the resolver
 * could not auto-detect (e.g. a third-party sensor SDK).
 */

import type { LLMContext } from '../context/types';
import { PromptBuilder } from './PromptBuilder';
import type { ProjectPlan } from '../planner/types';
import type { ComponentInstance } from '../types';

export interface LibrariesPromptInput {
  context: LLMContext;
  plan: ProjectPlan;
  components: ComponentInstance[];
  resolvedLibraries: string[];
}

export function buildLibrariesPrompt(input: LibrariesPromptInput): { system: string; user: string } {
  const system = [
    PromptBuilder.preamble(),
    '',
    'You add any extra Arduino/ESP32 libraries the chosen components',
    'need that the auto-resolver could not pick. Do not duplicate the',
    'already-resolved list.',
  ].join('\n');

  const user = [
    'Plan: ' + JSON.stringify(input.plan, null, 2),
    '',
    'Components:',
    JSON.stringify(input.components, null, 2),
    '',
    'Already resolved:',
    JSON.stringify(input.resolvedLibraries, null, 2),
    '',
    PromptBuilder.renderContext(input.context),
    '',
    'Output JSON shape:',
    '{ "libraries": ["...", "..."] }',
  ].join('\n');

  return { system, user };
}
