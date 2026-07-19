/**
 * Phase 9 - firmware prompt.
 *
 * The firmware generator gets a fully resolved ProjectPlan, the
 * component instances, the allocated pin map, the connections, and
 * the libraries. It does NOT receive natural language. The prompt
 * is therefore tiny and the LLM only needs to translate the
 * structure into Arduino/ESP32 source.
 */

import type { LLMContext } from '../context/types';
import { PromptBuilder } from './PromptBuilder';
import type { ProjectPlan } from '../planner/types';
import type { ComponentInstance, ConnectionSchema } from '../types';
import type { PinAllocation } from '../allocator/types';

export interface FirmwarePromptInput {
  context: LLMContext;
  plan: ProjectPlan;
  components: ComponentInstance[];
  connections: ConnectionSchema[];
  pinAllocation: PinAllocation[];
  libraries: string[];
  userPrompt: string;
}

export function buildFirmwarePrompt(input: FirmwarePromptInput): { system: string; user: string } {
  const system = [
    PromptBuilder.preamble(),
    '',
    'You write Arduino/ESP32 C++ source. The plan, components, pin',
    'allocations, connections, and libraries are all provided',
    'structurally — do not invent pins, ids, or libraries.',
  ].join('\n');

  const user = [
    `User request: ${input.userPrompt}`,
    '',
    'Plan:',
    JSON.stringify(input.plan, null, 2),
    '',
    'Components:',
    JSON.stringify(input.components, null, 2),
    '',
    'Pin allocations (use exactly these board pin assignments):',
    JSON.stringify(input.pinAllocation, null, 2),
    '',
    'Connections:',
    JSON.stringify(input.connections, null, 2),
    '',
    'Libraries:',
    JSON.stringify(input.libraries, null, 2),
    '',
    'Board:',
    JSON.stringify(input.context.board, null, 2),
    '',
    'Output JSON shape:',
    '{ "code": "<full Arduino/ESP32 source as a single string>" }',
  ].join('\n');

  return { system, user };
}
