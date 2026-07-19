/**
 * Phase 2 - Shared types for the LLM context layer.
 *
 * ContextBuilder returns an `LLMContext` made of these pieces. The LLM
 * never reads raw metadata JSON; it consumes the summarised shape
 * defined here.
 */

import type { ComponentMetadataEntry } from '../catalog/types';

export interface ComponentSummary {
  id: string;
  name: string;
  tagName?: string;
  category: string;
  description: string;
  tags: string[];
  properties: Record<string, unknown>;
  defaultProperties: Record<string, unknown>;
  voltage?: string;
  protocol?: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  /** Operating voltage, e.g. "5V" or "3.3V". */
  voltage: '3.3V' | '5V';
  /** Raw GPIO / pin names the LLM may write on a connection. */
  gpio: string[];
  /** Default I2C bus pin names, e.g. ["SDA", "SCL"] or ["GP4", "GP5"]. */
  i2c: string[];
  /** Default SPI bus pin names: [MOSI, MISO, SCK, CS]. */
  spi: string[];
  /** Default UART bus pin names: [TX, RX]. */
  uart: string[];
  /** Pin names usable as analog inputs. */
  analogPins: string[];
  /** Pin names usable as PWM outputs. */
  pwmPins: string[];
}

export interface ProtocolBuckets {
  i2c: ComponentSummary[];
  spi: ComponentSummary[];
  pwm: ComponentSummary[];
  uart: ComponentSummary[];
  onewire: ComponentSummary[];
}

export interface ExampleSummary {
  id: string;
  name: string;
  /** Short human-readable description, used to pick relevant examples. */
  summary: string;
  /** Tags / keywords, used for relevance matching. */
  tags: string[];
}

export interface LLMContext {
  /** Original user prompt. */
  prompt: string;
  /** Component summaries referenced by id elsewhere in this context. */
  components: ComponentSummary[];
  /** Board the user asked for (or default). */
  board: BoardSummary;
  /** Components grouped by required protocol. */
  protocols: ProtocolBuckets;
  /** Most relevant examples for the prompt. Empty array if none match. */
  examples: ExampleSummary[];
}

export function toComponentSummary(entry: ComponentMetadataEntry): ComponentSummary {
  return {
    id: entry.id,
    name: entry.name,
    tagName: entry.tagName,
    category: entry.category,
    description: entry.description,
    tags: entry.tags,
    properties: entry.properties,
    defaultProperties: entry.defaultValues,
    voltage: entry.voltage,
    protocol: entry.protocol,
  };
}
