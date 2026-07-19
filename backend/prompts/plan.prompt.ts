/**
 * Phase 4 - planner prompt.
 *
 * The LLM takes the LLMContext and decides the project's high-level
 * structure: which board, which components, which protocols, which
 * libraries, and a one-sentence intent + reasoning. The actual
 * component instances and connections come in later stages.
 *
 * The prompt is intentionally tiny. The context block carries the
 * rules; the LLM only needs to reason about which pieces to use.
 */

import type { LLMContext } from '../context/types';
import { PromptBuilder } from './PromptBuilder';

export interface PlanPromptInput {
  context: LLMContext;
}

export function buildPlanPrompt(input: PlanPromptInput): { system: string; user: string } {
  const ctx = input.context;
  const system = [
    PromptBuilder.preamble(),
    '',
    'You produce a ProjectPlan object. The plan describes WHAT the',
    'project is, not the wiring.',
  ].join('\n');

  const user = [
    'User request: ' + ctx.prompt,
    '',
    PromptBuilder.renderContext(ctx),
    '',
    'Output JSON shape:',
    '{',
    '  "intent": "<one sentence describing what the project does>",',
    '  "board": "<board id from context>",',
    '  "requiredProtocols": ["I2C" | "SPI" | "UART" | "PWM" | "OneWire", ...],',
    '  "requiredLibraries": ["Servo.h", "Wire.h", "Adafruit_SSD1306.h", ...],',
    '  "components": [',
    '    { "id": "<unique id>", "type": "<catalog id>", "reason": "<one sentence>" }',
    '  ],',
    '  "reasoning": "<short paragraph explaining the architecture>"',
    '}',
  ].join('\n');

  return { system, user };
}
