/**
 * Phase 2 - ContextBuilder.
 *
 * One entry point. The LLM calls this with a user prompt and gets a
 * structured `LLMContext` back. The context is the only thing the LLM
 * is shown; raw metadata JSON never reaches the prompt.
 */

import { BoardContext } from './BoardContext';
import { ComponentContext } from './ComponentContext';
import { ProtocolContext } from './ProtocolContext';
import { ExampleContext } from './ExampleContext';
import type { BoardSummary, LLMContext, ComponentSummary } from './types';

export interface BuildOptions {
  /** Override the board detected from the prompt. */
  boardId?: string;
  /** Cap how many catalog components are surfaced. */
  maxComponents?: number;
  /** Cap how many examples are surfaced. */
  maxExamples?: number;
}

export class ContextBuilder {
  static build(prompt: string, opts: BuildOptions = {}): LLMContext {
    const board: BoardSummary = opts.boardId
      ? BoardContext.forBoard(opts.boardId)
      : BoardContext.detectFromPrompt(prompt);

    const maxComponents = opts.maxComponents ?? 20;
    const maxExamples = opts.maxExamples ?? 3;

    const components: ComponentSummary[] = ComponentContext.searchByPrompt(prompt, maxComponents);
    const protocols = ProtocolContext.bucket(components);
    const examples = ExampleContext.forPrompt(prompt, maxExamples);

    return {
      prompt,
      components,
      board,
      protocols,
      examples,
    };
  }
}
