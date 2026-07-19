/**
 * Phase 2 - Board context.
 *
 * Exposes the per-board pin tables the LLM needs to make safe
 * connection choices. The data is hard-coded here for the supported
 * boards; in a follow-up this can be loaded from a JSON file the same
 * way components-metadata.json is loaded, but for now we keep it as
 * static TS so the loader layer stays simple.
 */

import type { BoardSummary } from './types';

const ARDUINO_UNO: BoardSummary = {
  id: 'arduino-uno',
  name: 'Arduino Uno',
  voltage: '5V',
  gpio: Array.from({ length: 14 }, (_, i) => String(i)).concat(['A0', 'A1', 'A2', 'A3', 'A4', 'A5']),
  i2c: ['A4', 'A5'],
  spi: ['11', '12', '13', '10'],
  uart: ['0', '1'],
  analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  pwmPins: ['3', '5', '6', '9', '10', '11'],
};

const ARDUINO_NANO: BoardSummary = {
  id: 'arduino-nano',
  name: 'Arduino Nano',
  voltage: '5V',
  gpio: Array.from({ length: 14 }, (_, i) => String(i)).concat(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']),
  i2c: ['A4', 'A5'],
  spi: ['11', '12', '13', '10'],
  uart: ['0', '1'],
  analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
  pwmPins: ['3', '5', '6', '9', '10', '11'],
};

const ARDUINO_MEGA: BoardSummary = {
  id: 'arduino-mega',
  name: 'Arduino Mega 2560',
  voltage: '5V',
  gpio: Array.from({ length: 54 }, (_, i) => String(i)).concat(
    Array.from({ length: 16 }, (_, i) => `A${i}`)
  ),
  i2c: ['20', '21'],
  spi: ['51', '50', '52', '53'],
  uart: ['0', '1', '18', '19', '16', '17', '14', '15'],
  analogPins: Array.from({ length: 16 }, (_, i) => `A${i}`),
  pwmPins: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
};

const ESP32: BoardSummary = {
  id: 'esp32',
  name: 'ESP32 DevKit v1',
  voltage: '3.3V',
  gpio: [
    '0', '1', '2', '3', '4', '5', '12', '13', '14', '15', '16', '17',
    '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', '36', '39',
  ],
  i2c: ['21', '22'],
  spi: ['23', '19', '18', '5'],
  uart: ['1', '3'],
  analogPins: ['34', '35', '36', '39', '32', '33'],
  pwmPins: [
    '0', '1', '2', '3', '4', '5', '12', '13', '14', '15', '16', '17',
    '18', '19', '21', '22', '23', '25', '26', '27',
  ],
};

const PI_PICO: BoardSummary = {
  id: 'pi-pico',
  name: 'Raspberry Pi Pico (RP2040)',
  voltage: '3.3V',
  gpio: Array.from({ length: 29 }, (_, i) => `GP${i}`),
  i2c: ['GP4', 'GP5'],
  spi: ['GP19', 'GP16', 'GP18', 'GP17'],
  uart: ['GP0', 'GP1'],
  analogPins: ['GP26', 'GP27', 'GP28'],
  pwmPins: Array.from({ length: 29 }, (_, i) => `GP${i}`),
};

const BOARDS: Record<string, BoardSummary> = {
  'arduino-uno': ARDUINO_UNO,
  'arduino-nano': ARDUINO_NANO,
  'arduino-mega': ARDUINO_MEGA,
  esp32: ESP32,
  'pi-pico': PI_PICO,
};

export class BoardContext {
  static forBoard(id: string): BoardSummary {
    if (BOARDS[id]) return BOARDS[id];
    const alias =
      id === 'uno' ? 'arduino-uno' :
      id === 'nano' ? 'arduino-nano' :
      id === 'mega' ? 'arduino-mega' :
      id === 'esp32-devkit-v1' || id === 'esp32_devkit_v1' ? 'esp32' :
      id === 'rp2040' || id === 'pico' ? 'pi-pico' :
      null;
    if (alias && BOARDS[alias]) return BOARDS[alias];
    return ARDUINO_UNO;
  }

  static listBoards(): BoardSummary[] {
    return Object.values(BOARDS);
  }

  /** Guess a board from a free-text prompt. Returns the default if none match. */
  static detectFromPrompt(prompt: string): BoardSummary {
    const lower = prompt.toLowerCase();
    if (lower.includes('mega')) return ARDUINO_MEGA;
    if (lower.includes('nano')) return ARDUINO_NANO;
    if (lower.includes('pico') || lower.includes('rp2040')) return PI_PICO;
    if (lower.includes('esp32') || lower.includes('esp-32')) return ESP32;
    if (lower.includes('arduino') || lower.includes('uno')) return ARDUINO_UNO;
    return ARDUINO_UNO;
  }
}
