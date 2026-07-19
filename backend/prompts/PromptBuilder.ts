/**
 * Phase 3 - PromptBuilder.
 *
 * Replaces the rule-heavy `systemPrompt` blobs in `api/generate.ts`
 * with short, context-referencing prompts. Most of the rules that
 * used to be inlined ("Servo must use PWM", "5V components must use
 * Arduino Uno", etc.) are now expressed structurally via the
 * `LLMContext` (board.voltage, board.pwmPins, component.protocol, ...).
 *
 * Each pipeline stage has its own prompt file:
 *   - plan.prompt.ts          (Phase 4)
 *   - components.prompt.ts    (Phase 5)
 *   - connections.prompt.ts   (Phase 5)
 *   - libraries.prompt.ts     (Phase 7)
 *   - firmware.prompt.ts      (Phase 9)
 *
 * PromptBuilder is the one place that knows how to serialize an
 * LLMContext to text.
 */

import type { LLMContext } from '../context/types';

export class PromptBuilder {
  /** A short preamble shared by every stage prompt. */
  static preamble(): string {
    return [
      'You are a hardware layout assistant for Velxio, a Wokwi-compatible simulator.',
      'You always output valid JSON. No prose, no markdown fences.',
      'You use only the components, pins, and protocols listed in the context below.',
    ].join(' ');
  }

  /** Serialize the context to a stable, compact text block. */
  static renderContext(ctx: LLMContext): string {
    const lines: string[] = [];
    lines.push('--- Board ---');
    lines.push(`name: ${ctx.board.name}`);
    lines.push(`voltage: ${ctx.board.voltage}`);
    lines.push(`gpio: ${ctx.board.gpio.join(', ')}`);
    lines.push(`i2c: ${ctx.board.i2c.join(', ')}`);
    lines.push(`spi: ${ctx.board.spi.join(', ')}`);
    lines.push(`uart: ${ctx.board.uart.join(', ')}`);
    lines.push(`analogPins: ${ctx.board.analogPins.join(', ')}`);
    lines.push(`pwmPins: ${ctx.board.pwmPins.join(', ')}`);

    lines.push('');
    lines.push('--- Components (catalog match) ---');
    for (const c of ctx.components) {
      const parts = [
        `id: ${c.id}`,
        `name: ${c.name}`,
        `category: ${c.category}`,
      ];
      if (c.protocol) parts.push(`protocol: ${c.protocol}`);
      if (c.voltage) parts.push(`voltage: ${c.voltage}`);
      if (c.tags.length) parts.push(`tags: [${c.tags.join(', ')}]`);
      if (Object.keys(c.defaultProperties).length) {
        parts.push(`defaults: ${JSON.stringify(c.defaultProperties)}`);
      }
      if (c.description) parts.push(`description: ${c.description}`);
      lines.push(parts.join(' | '));
    }

    lines.push('');
    lines.push('--- Protocol buckets ---');
    for (const [k, v] of Object.entries(ctx.protocols)) {
      const ids = v.map((c: { id: string }) => c.id).join(', ');
      lines.push(`${k}: [${ids}]`);
    }

    if (ctx.examples.length) {
      lines.push('');
      lines.push('--- Relevant examples ---');
      for (const ex of ctx.examples) {
        lines.push(`${ex.id}: ${ex.summary}`);
      }
    }
    return lines.join('\n');
  }
}
