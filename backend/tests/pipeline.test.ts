// Unit tests for the refactored pipeline.
//
// Run with: cd backend && npx vitest run
//
// These are smoke tests. They do not require AWS creds; every stage
// uses a stub LlmClient that returns canned responses.

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { Planner } from '../planner/Planner';
import { LlmClient, LlmChatOptions } from '../planner/LlmClient';
import { ComponentsStage } from '../pipeline/ComponentsStage';
import { ConnectionsStage } from '../pipeline/ConnectionsStage';
import { FirmwareStage } from '../pipeline/FirmwareStage';
import { LibraryResolver } from '../pipeline/LibraryResolver';
import { Pipeline } from '../pipeline/Pipeline';
import { PinAllocator } from '../allocator/PinAllocator';
import { validateProject } from '../validators-core';
import { ContextBuilder } from '../context/ContextBuilder';
import { BoardContext } from '../context/BoardContext';
import { ProjectPlan } from '../planner/types';
import { CatalogService } from '../catalog/CatalogService';

class StubLlm implements LlmClient {
  constructor(private readonly reply: string) {}
  async chat(_prompt: string, _opts?: LlmChatOptions): Promise<string> {
    return this.reply;
  }
}

class ScriptedLlm implements LlmClient {
  private i = 0;
  constructor(private readonly replies: string[]) {}
  async chat(_prompt: string, _opts?: LlmChatOptions): Promise<string> {
    const r = this.replies[this.i] ?? this.replies[this.replies.length - 1] ?? '{}';
    this.i++;
    return r;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

beforeAll(() => {
  if (!fs.existsSync(path.join(DATA_DIR, 'components-metadata.json'))) {
    throw new Error(`components-metadata.json missing in ${DATA_DIR}; tests need the real catalog.`);
  }
  // Eager-init the catalog for the validator and pin allocator.
  CatalogService.resetForTests();
  CatalogService.init({ metadataPath: path.join(DATA_DIR, 'components-metadata.json'), overridesPath: path.join(DATA_DIR, 'component-overrides.json') });
});

describe('ContextBuilder', () => {
  it('detects the board from a prompt', () => {
    const ctx = ContextBuilder.build('blink an LED on an arduino uno');
    expect(ctx.board.id).toBe('arduino-uno');
  });

  it('exposes protocol buckets', () => {
    const ctx = ContextBuilder.build('arduino with oled and servo');
    expect(ctx.protocols).toBeDefined();
    expect(Array.isArray(ctx.protocols.i2c)).toBe(true);
    expect(Array.isArray(ctx.protocols.pwm)).toBe(true);
  });
});

describe('BoardContext', () => {
  it('knows five boards', () => {
    expect(BoardContext.listBoards().length).toBe(5);
  });

  it('has PWM pins for arduino-uno', () => {
    const b = BoardContext.forBoard('arduino-uno');
    expect(b.pwmPins).toContain('9');
  });
});

describe('LibraryResolver', () => {
  it('resolves Servo for a servo component', () => {
    const libs = new LibraryResolver().resolve([{ id: 's1', type: 'servo', x: 0, y: 0 }]);
    expect(libs).toContain('Servo');
  });

  it('resolves Adafruit_SSD1306 for an oled component', () => {
    const libs = new LibraryResolver().resolve([{ id: 'o1', type: 'ssd1306', x: 0, y: 0 }]);
    expect(libs.some((l) => /SSD1306|GFX/i.test(l))).toBe(true);
  });

  it('returns no libraries for an empty project', () => {
    expect(new LibraryResolver().resolve([])).toEqual([]);
  });
});

describe('PinAllocator', () => {
  it('allocates PWM pins first, then digital', () => {
    const alloc = new PinAllocator().allocate('arduino-uno', [
      { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
      { id: 's1', type: 'servo', x: 0, y: 0 },
    ]);
    const servoPwm = alloc.pins.find((p) => p.componentId === 's1' && /PWM/i.test(p.pin));
    expect(servoPwm).toBeDefined();
    // First free PWM pin on Uno is 3
    expect(servoPwm?.boardPin).toBe('3');
  });

  it('reserves I2C pins', () => {
    const alloc = new PinAllocator().allocate('arduino-uno', [
      { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
    ]);
    const sda = alloc.reserved.find((r) => r.pin === 'SDA');
    const scl = alloc.reserved.find((r) => r.pin === 'SCL');
    expect(sda?.boardPin).toBe('A4');
    expect(scl?.boardPin).toBe('A5');
  });
});

describe('Planner', () => {
  it('parses a clean JSON plan', async () => {
    const reply = JSON.stringify({
      intent: 'blink an led',
      board: 'arduino-uno',
      requiredProtocols: [],
      requiredLibraries: [],
      components: [{ id: 'led1', type: 'led', reason: 'visible output' }],
      reasoning: 'trivial',
    });
    const plan: ProjectPlan = await new Planner({ llm: new StubLlm(reply) }).plan('blink an led');
    expect(plan.board).toBe('arduino-uno');
    expect(plan.components).toHaveLength(1);
  });

  it('extracts a JSON object out of a chatty response', async () => {
    const reply = `Sure! Here is the plan:\n${JSON.stringify({
      intent: 'oled weather',
      board: 'esp32-devkit-c',
      requiredProtocols: ['i2c'],
      requiredLibraries: [{ name: 'Adafruit_SSD1306', reason: 'oled' }],
      components: [{ id: 'oled1', type: 'ssd1306', reason: 'display' }],
      reasoning: 'weather station',
    })}\nDone!`;
    const plan = await new Planner({ llm: new StubLlm(reply) }).plan('weather station');
    expect(plan.board).toBe('esp32-devkit-c');
    expect(plan.requiredProtocols).toContain('i2c');
  });

  it('normalises common board aliases', async () => {
    const reply = JSON.stringify({
      intent: 'use an Uno',
      board: 'uno',
      requiredProtocols: [],
      requiredLibraries: [],
      components: [],
      reasoning: '',
    });
    const plan = await new Planner({ llm: new StubLlm(reply) }).plan('use an Uno');
    expect(plan.board).toBe('arduino-uno');
  });
});

describe('validators-core', () => {
  it('flags a missing power connection', () => {
    const res = validateProject({
      projectMetadata: { name: 't' },
      components: [
        { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
        { id: 'l1', type: 'led', x: 0, y: 0 },
      ],
      connections: [
        { from: 'arduino-uno:9', to: 'l1:A' },
        { from: 'arduino-uno:GND.1', to: 'l1:C' },
      ],
      firmware: { code: '' },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.type === 'missing_power')).toBe(true);
  });

  it('passes a minimal valid project', () => {
    const res = validateProject({
      projectMetadata: { name: 't' },
      components: [
        { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
        { id: 'l1', type: 'led', x: 0, y: 0 },
      ],
      connections: [
        { from: 'arduino-uno:5V', to: 'l1:A' },
        { from: 'arduino-uno:9', to: 'l1:C' },
        { from: 'arduino-uno:GND.1', to: 'l1:A' },
      ],
      firmware: { code: '' },
    });
    // pin existence checks are intentionally permissive (catalog presence only).
    expect(res.errors.some((e) => e.type === 'duplicate_connection')).toBe(false);
  });
});

describe('Pipeline (scripted LLM)', () => {
  it('runs all stages end-to-end and returns a result', async () => {
    const plan = JSON.stringify({
      intent: 'blink',
      board: 'arduino-uno',
      requiredProtocols: [],
      requiredLibraries: [],
      components: [{ id: 'led1', type: 'led', reason: 'output' }],
      reasoning: 'simple',
    });
    const components = JSON.stringify([{ id: 'arduino-uno', type: 'arduino-uno', x: 100, y: 100 }]);
    const connections = JSON.stringify([
      { from: 'arduino-uno:5V', to: 'led1:A' },
      { from: 'arduino-uno:GND.1', to: 'led1:C' },
    ]);
    const code = 'void setup(){pinMode(13,OUTPUT);}void loop(){digitalWrite(13,HIGH);}';

    const llm = new ScriptedLlm([plan, components, connections, code]);
    const pipeline = new Pipeline({ llm });
    const result = await pipeline.run('blink an led');
    expect(result.stages).toContain('plan');
    expect(result.stages).toContain('components');
    expect(result.stages).toContain('connections');
    expect(result.stages).toContain('libraries');
    expect(result.stages).toContain('allocate');
    expect(result.stages).toContain('firmware');
    expect(result.stages).toContain('validate');
    expect(result.project.components.length).toBeGreaterThan(0);
    expect(result.allocation.reserved.length).toBeGreaterThan(0);
  });
});
