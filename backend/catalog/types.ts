export interface ComponentPin {
  name: string;                  // "DIN", "VCC", "GND", "1.l"
  type?: string;                 // digital, analog, power...
  direction?: string;            // input, output, bidirectional
  aliases?: string[];
}

export interface ComponentMetadataEntry {
  id: string;
  tagName?: string;
  name: string;
  category: string;
  description: string;

  pinCount: number;
  pins: ComponentPin[];          // <-- KEEP THE REAL PINS

  tags: string[];

  properties: Record<string, unknown>;
  defaultValues: Record<string, unknown>;

  protocol?: string;
  voltage?: string;

  source: 'metadata' | 'override';
}