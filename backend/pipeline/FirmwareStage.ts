// Firmware generation stage.
//
// Receives the structured plan (plan + components + connections +
// libraries) and asks the LLM for the Arduino sketch. Because the LLM
// is given concrete pin numbers from the validated ConnectionSchema, the
// firmware does not need to "discover" anything — it just translates
// wiring into code.

import type { ComponentInstance, ConnectionSchema } from '../types';
import { LlmClient, BedrockLlmClient } from '../planner/LlmClient';
import { LLMContext } from '../context/types';
import { buildFirmwarePrompt } from '../prompts/firmware.prompt';
import { ProjectPlan } from '../planner/types';
import { PinAllocation } from '../allocator/types';

export interface FirmwareStageOptions {
  llm?: LlmClient;
}

const FALLBACK_SKETCH = `void setup() {
  // Code generation failed
}
void loop() {
}
`;

export class FirmwareStage {
  private readonly llm: LlmClient;
  constructor(opts: FirmwareStageOptions = {}) {
    this.llm = opts.llm ?? new BedrockLlmClient();
  }

  async run(
    prompt: string,
    plan: ProjectPlan,
    components: ComponentInstance[],
    connections: ConnectionSchema[],
    libraries: string[],
    context: LLMContext,
    pinAllocation: PinAllocation[] = [],
  ): Promise<string> {
    const { system, user } = buildFirmwarePrompt({
      context,
      plan,
      components,
      connections,
      libraries,
      pinAllocation,
      userPrompt: prompt,
    });
    try {
      const raw = await this.llm.chat(user, { system, temperature: 0.2, maxTokens: 4000 });
      return stripCodeFence(raw);
    } catch {
      return FALLBACK_SKETCH;
    }
  }
}

function stripCodeFence(raw: string): string {
  let txt = raw.trim();
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```[a-zA-Z0-9+\-_]*\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  return txt;
}
