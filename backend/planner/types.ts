// Planner output types. The Planner is the first LLM stage and decides
// the overall project architecture. Everything else follows this plan.

export type BoardId =
  | 'arduino-uno'
  | 'arduino-nano'
  | 'arduino-mega'
  | 'esp32-devkit-c'
  | 'raspberry-pi-pico';

export type ProtocolId = 'i2c' | 'spi' | 'uart' | 'pwm' | 'onewire' | 'analog';

export interface PlannedComponent {
  /** Stable id used in the next stage (e.g. "led-status"). Lowercase-kebab. */
  id: string;
  /** Velxio catalog id, e.g. "led", "ssd1306", "dht22". */
  type: string;
  /** Short, human-readable reason this component is needed. */
  reason: string;
}

export interface LibraryHint {
  /** Arduino/ESP library name to #include, e.g. "Wire", "Adafruit_SSD1306". */
  name: string;
  /** Why this library is required. */
  reason: string;
}

export interface ProjectPlan {
  /** Verbatim restatement of what the user wants. */
  intent: string;
  /** Chosen board id from the supported set. */
  board: BoardId;
  /** Protocols required by the project. Planner enumerates these. */
  requiredProtocols: ProtocolId[];
  /** Pre-declared libraries the LLM believes are necessary. */
  requiredLibraries: LibraryHint[];
  /** Component list (instances will be filled in by the next stage). */
  components: PlannedComponent[];
  /** Free-form reasoning shown in UI / debug logs. */
  reasoning: string;
}
