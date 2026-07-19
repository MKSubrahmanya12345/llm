// Pipeline — orchestrates Planner → Components → Connections →
// Libraries → Firmware → Validation. One retry pass on validation, then
// the structured errors are returned (Phase 6 — no retry abuse).

import { ContextBuilder } from '../context/ContextBuilder';
import { LLMContext } from '../context/types';
import { Planner } from '../planner/Planner';
import { LlmClient, BedrockLlmClient } from '../planner/LlmClient';
import { ProjectPlan } from '../planner/types';
import { PinAllocator } from '../allocator/PinAllocator';
import { AllocationResult } from '../allocator/types';
import { ComponentsStage } from './ComponentsStage';
import { ConnectionsStage } from './ConnectionsStage';
import { FirmwareStage } from './FirmwareStage';
import { LibraryResolver } from './LibraryResolver';
import {
  validateProject,
  ValidationError,
  ValidationResult,
} from '../validators-core';
import type { ComponentInstance, ConnectionSchema, VelxioProject } from '../types';

export type ProgressEvent =
  | { type: 'step'; message: string }
  | { type: 'info'; message: string }
  | { type: 'error'; message: string }
  | { type: 'success'; message: string };

export interface PipelineOptions {
  llm?: LlmClient;
  /** Override stages for tests. */
  componentsStage?: ComponentsStage;
  connectionsStage?: ConnectionsStage;
  firmwareStage?: FirmwareStage;
  libraryResolver?: LibraryResolver;
  planner?: Planner;
  pinAllocator?: PinAllocator;
}

export interface PipelineResult {
  project: VelxioProject;
  plan: ProjectPlan;
  context: LLMContext;
  allocation: AllocationResult;
  libraries: string[];
  validation: ValidationResult;
  /** Stages that completed before success. */
  stages: string[];
}

export class Pipeline {
  private readonly llm: LlmClient;
  private readonly planner: Planner;
  private readonly componentsStage: ComponentsStage;
  private readonly connectionsStage: ConnectionsStage;
  private readonly firmwareStage: FirmwareStage;
  private readonly libraries: LibraryResolver;
  private readonly allocator: PinAllocator;

  constructor(opts: PipelineOptions = {}) {
    this.llm = opts.llm ?? new BedrockLlmClient();
    this.planner = opts.planner ?? new Planner({ llm: this.llm });
    this.componentsStage = opts.componentsStage ?? new ComponentsStage({ llm: this.llm });
    this.connectionsStage = opts.connectionsStage ?? new ConnectionsStage({ llm: this.llm });
    this.firmwareStage = opts.firmwareStage ?? new FirmwareStage({ llm: this.llm });
    this.libraries = opts.libraryResolver ?? new LibraryResolver();
    this.allocator = opts.pinAllocator ?? new PinAllocator();
  }

  async run(
    prompt: string,
    onProgress: (evt: ProgressEvent) => void = () => {},
  ): Promise<PipelineResult> {
    const stages: string[] = [];
    const context = ContextBuilder.build(prompt);

    onProgress({ type: 'step', message: 'Planning project architecture...' });
    const plan = await this.planner.plan(prompt);
    stages.push('plan');
    onProgress({
      type: 'success',
      message: `Planned ${plan.components.length} components on ${plan.board}.`,
    });

    onProgress({ type: 'step', message: 'Instantiating components...' });
    const components = await this.componentsStage.run(plan, context);
    stages.push('components');
    onProgress({
      type: 'success',
      message: `Components: ${components.map((c) => c.id).join(', ')}`,
    });

    onProgress({ type: 'step', message: 'Designing wiring connections...' });
    let connections = await this.connectionsStage.run(plan, components, context);
    stages.push('connections');
    onProgress({
      type: 'success',
      message: `Connections: ${connections.length} wires.`,
    });

    onProgress({ type: 'step', message: 'Resolving required libraries...' });
    const libraries = this.libraries.resolve(components);
    stages.push('libraries');
    onProgress({
      type: 'info',
      message: libraries.length ? `Libraries: ${libraries.join(', ')}` : 'No extra libraries required.',
    });

    onProgress({ type: 'step', message: 'Allocating board pins...' });
    const allocation = this.allocator.allocate(plan.board, components);
    stages.push('allocate');

    onProgress({ type: 'step', message: 'Generating Arduino firmware...' });
    const code = await this.firmwareStage.run(prompt, plan, components, connections, libraries, context, allocation.pins);
    stages.push('firmware');

    let project: VelxioProject = {
      projectMetadata: {
        name: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
      },
      components,
      connections,
      firmware: { code },
      libraries: libraries.length ? libraries : undefined,
    };

    onProgress({ type: 'step', message: 'Validating project...' });
    let validation = validateProject(project);
    stages.push('validate');

    // Phase 6: one repair attempt using the LLM as an editor.
    if (!validation.valid) {
      onProgress({
        type: 'error',
        message: `Validation failed with ${validation.errors.length} issue(s). One repair attempt...`,
      });
      try {
        const repaired = await this.repair(project, plan, validation.errors);
        if (repaired) {
          connections = repaired.connections;
          project = { ...project, connections, components: repaired.components };
          validation = validateProject(project);
        }
      } catch (e) {
        onProgress({
          type: 'info',
          message: `Repair pass failed: ${(e as Error).message}. Returning current errors.`,
        });
      }
    }

    if (validation.valid) {
      onProgress({ type: 'success', message: 'Project assembled and validated.' });
    } else {
      onProgress({
        type: 'error',
        message: `Project could not be fully validated: ${validation.errors.length} issue(s) remain.`,
      });
    }

    return { project, plan, context, allocation, libraries, validation, stages };
  }

  /** Single repair attempt: feed the structured errors back to the LLM. */
  private async repair(
    project: VelxioProject,
    plan: ProjectPlan,
    errors: ValidationError[],
  ): Promise<{ components: ComponentInstance[]; connections: ConnectionSchema[] } | null> {
    const promptText = [
      `The previous project was rejected. Repair it.`,
      `Plan: ${JSON.stringify(plan)}`,
      `Project: ${JSON.stringify(project)}`,
      `Errors: ${JSON.stringify(errors)}`,
      `Return ONLY a JSON object with shape { "components": [...], "connections": [...] }.`,
    ].join('\n');
    const raw = await this.llm.chat(promptText, { temperature: 0.0, maxTokens: 2000 });
    try {
      const obj = JSON.parse(raw);
      if (Array.isArray(obj.components) && Array.isArray(obj.connections)) {
        return { components: obj.components, connections: obj.connections };
      }
    } catch {
      // ignore
    }
    return null;
  }
}
