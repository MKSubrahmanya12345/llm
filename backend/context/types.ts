import type { ComponentMetadataEntry } from '../catalog/types';

export interface ComponentPin {
  name: string;
  type?: string;
  direction?: 'input' | 'output' | 'bidirectional' | 'power' | 'ground';
  required?: boolean;
  aliases?: string[];
}

export interface ComponentSummary {
  id: string;
  name: string;
  tagName?: string;
  category: string;
  description: string;

  tags: string[];

  // <<< THIS IS THE IMPORTANT PART >>>
  pins: ComponentPin[];

  properties: Record<string, unknown>;
  defaultProperties: Record<string, unknown>;

  voltage?: string;
  protocol?: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  voltage: '3.3V' | '5V';

  gpio: string[];
  i2c: string[];
  spi: string[];
  uart: string[];
  analogPins: string[];
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
  summary: string;
  tags: string[];
}

export interface LLMContext {
  prompt: string;
  components: ComponentSummary[];
  board: BoardSummary;
  protocols: ProtocolBuckets;
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

    // Pass through the exact metadata pins.
    pins: (entry.pins ?? []).map((pin: any) => ({
      name: pin.name,
      type: pin.type,
      direction: pin.direction,
      required: pin.required,
      aliases: pin.aliases ?? [],
    })),

    properties: entry.properties,
    defaultProperties: entry.defaultValues,

    voltage: entry.voltage,
    protocol: entry.protocol,
  };
}