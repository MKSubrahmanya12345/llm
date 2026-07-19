// LlmClient — thin wrapper over the Bedrock SDK used by the Planner and
// (later) every other pipeline stage. The Pipeline should never call the
// SDK directly; this keeps the surface small and makes the client easy to
// stub in tests.

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmChatOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmClient {
  chat(prompt: string, opts?: LlmChatOptions): Promise<string>;
}

export interface BedrockLlmClientOptions {
  region?: string;
  modelId?: string;
}

const DEFAULT_REGION = process.env.AWS_REGION || 'eu-north-1';
const DEFAULT_MODEL = process.env.BEDROCK_MODEL_ID || 'qwen.qwen3-coder-30b-a3b-v1:0';

export class BedrockLlmClient implements LlmClient {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(opts: BedrockLlmClientOptions = {}) {
    this.client = new BedrockRuntimeClient({ region: opts.region ?? DEFAULT_REGION });
    this.modelId = opts.modelId ?? DEFAULT_MODEL;
  }

  async chat(prompt: string, opts: LlmChatOptions = {}): Promise<string> {
    const messages: LlmMessage[] = [{ role: 'user', content: prompt }];
    const body: InvokeModelCommandInput = {
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages,
        ...(opts.system ? { system: opts.system } : {}),
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2048,
      }),
    };
    const out = await this.client.send(new InvokeModelCommand(body));
    const text = out.body ? await out.body.transformToString() : '';
    return this.extractContent(text);
  }

  /** Qwen3 returns OpenAI-style chat JSON; pull the first message content. */
  private extractContent(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.choices?.[0]?.message?.content) {
        return String(parsed.choices[0].message.content);
      }
    } catch {
      // fall through
    }
    return raw;
  }
}
