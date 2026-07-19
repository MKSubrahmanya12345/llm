/**
 * Normalized internal catalog shape.
 *
 * The rest of the LLM pipeline (context builder, planner, validators,
 * pin allocator, library resolver) only ever sees this shape, never the
 * raw JSON.
 */

export interface ComponentMetadataEntry {
  /** Stable id used as the canonical key, e.g. "ssd1306". */
  id: string;
  /** Wokwi/velxio element tag, e.g. "wokwi-ssd1306". May be undefined. */
  tagName?: string;
  /** Human-readable name. */
  name: string;
  /** Coarse taxonomy bucket (input, output, display, sensor, ...). */
  category: string;
  description: string;
  /** Number of pins as declared by the metadata. Use 0 if unknown. */
  pinCount: number;
  tags: string[];
  properties: Record<string, unknown>;
  defaultValues: Record<string, unknown>;
  /** Required protocol if any, e.g. "I2C", "SPI", "UART", "PWM", "OneWire". */
  protocol?: string;
  /** Operating voltage if declared, e.g. "3.3V" or "5V". */
  voltage?: string;
  /** Where this entry came from, for debugging only. */
  source: 'metadata' | 'override';
}
