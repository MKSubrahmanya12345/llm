// PinAllocator (Phase 8).
//
// Given a ProjectPlan and a list of components, allocate board pins for
// every component pin. The LLM never picks a board pin directly — this
// module is the single source of truth for GPIO assignment.
//
// Strategy:
//   1. Reserve protocol pins (I2C, SPI, UART) on the board.
//   2. For each non-board component, run a simple allocator:
//      - power/GND pins get board power/ground rails
//      - I2C signal pins go to the board's I2C pins
//      - PWM signal pins go to the first free PWM-capable board pin
//      - analog signal pins go to the first free analog board pin
//      - everything else gets the first free digital pin
//   3. Return AllocationResult with `pins` (per component pin) and
//      `reserved` (board protocol pins).

import { ComponentContext } from '../context/ComponentContext';
import { CatalogService } from '../catalog/CatalogService';
import type { ComponentInstance } from '../types';
import { BoardId } from '../planner/types';
import {
  AllocationResult,
  PinAllocation,
  PinKind,
} from './types';

const POWER_PINS = ['5V', '3V3', 'VCC', 'VIN', 'VBUS', 'VSYS', 'V+'];
const GROUND_PINS = ['GND'];
const I2C_PINS = ['SDA', 'SCL'];
const SPI_PINS = ['MOSI', 'MISO', 'SCK', 'CS', 'SS'];
const UART_PINS = ['RX', 'TX'];
const ONEWIRE_PINS = ['DQ', 'DATA', 'SDA']; // DHT-style single-wire data
const PWM_HINT = ['PWM', 'SIG', 'EN', 'IN1', 'IN2'];

interface BoardPinSpec {
  digital: string[];
  pwm: string[];
  analog: string[];
  i2c: { sda: string; scl: string };
  spi: { mosi: string; miso: string; sck: string; cs: string };
  uart: { rx: string; tx: string };
  power: string[];
  ground: string[];
}

const BOARD_PINS: Record<BoardId, BoardPinSpec> = {
  'arduino-uno': {
    digital: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13'],
    pwm: ['3','5','6','9','10','11'],
    analog: ['A0','A1','A2','A3','A4','A5'],
    i2c: { sda: 'A4', scl: 'A5' },
    spi: { mosi: '11', miso: '12', sck: '13', cs: '10' },
    uart: { rx: '0', tx: '1' },
    power: ['5V','3.3V','VIN'],
    ground: ['GND.1','GND.2','GND.3'],
  },
  'arduino-nano': {
    digital: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13'],
    pwm: ['3','5','6','9','10','11'],
    analog: ['A0','A1','A2','A3','A4','A5','A6','A7'],
    i2c: { sda: 'A4', scl: 'A5' },
    spi: { mosi: '11', miso: '12', sck: '13', cs: '10' },
    uart: { rx: '0', tx: '1' },
    power: ['5V','3.3V','VIN'],
    ground: ['GND.1','GND.2'],
  },
  'arduino-mega': {
    digital: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53'],
    pwm: ['2','3','4','5','6','7','8','9','10','11','12','13','44','45','46'],
    analog: ['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
    i2c: { sda: '20', scl: '21' },
    spi: { mosi: '51', miso: '50', sck: '52', cs: '53' },
    uart: { rx: '0', tx: '1' },
    power: ['5V','3.3V','VIN'],
    ground: ['GND.1','GND.2','GND.3'],
  },
  'esp32-devkit-c': {
    digital: ['0','1','2','3','4','5','12','13','14','15','16','17','18','19','21','22','23','25','26','27','32','33'],
    pwm: ['0','1','2','3','4','5','12','13','14','15','16','17','18','19','21','22','23','25','26','27','32','33'],
    analog: ['32','33','34','35','36','39'],
    i2c: { sda: '21', scl: '22' },
    spi: { mosi: '23', miso: '19', sck: '18', cs: '5' },
    uart: { rx: '16', tx: '17' },
    power: ['3V3','5V','VIN'],
    ground: ['GND'],
  },
  'raspberry-pi-pico': {
    digital: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','26','27','28'],
    pwm: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','26','27','28'],
    analog: ['26','27','28'],
    i2c: { sda: '4', scl: '5' },
    spi: { mosi: '19', miso: '16', sck: '18', cs: '17' },
    uart: { rx: '1', tx: '0' },
    power: ['3V3','VBUS','VSYS'],
    ground: ['GND'],
  },
};

export class PinAllocator {
  private readonly catalog: CatalogService;

  constructor(catalog: CatalogService = CatalogService.get()) {
    this.catalog = catalog;
  }

  /**
   * Allocate board pins for every component in the project. The board
   * instance MUST be present in the components list. Components whose
   * type is missing from the catalog are returned as notes only.
   */
  allocate(
    boardId: BoardId,
    components: ComponentInstance[],
  ): AllocationResult {
    const spec = BOARD_PINS[boardId];
    if (!spec) {
      return { board: boardId, pins: [], reserved: [], notes: `No pin spec for board "${boardId}".` };
    }
    const boardInstance =
      components.find((c) => c.id === boardId) ??
      components.find((c) => BOARD_PINS[c.type as BoardId] !== undefined);
    if (!boardInstance) {
      return { board: boardId, pins: [], reserved: [], notes: `Board instance not present in components.` };
    }
    const boardPin = boardInstance.id;

    const used = new Set<string>();
    const alloc: PinAllocation[] = [];
    const reserved: PinAllocation[] = [];

    // Reserve protocol pins
    reserved.push({ componentId: boardPin, pin: 'SDA', boardPin: spec.i2c.sda, kind: 'i2c' });
    reserved.push({ componentId: boardPin, pin: 'SCL', boardPin: spec.i2c.scl, kind: 'i2c' });
    reserved.push({ componentId: boardPin, pin: 'MOSI', boardPin: spec.spi.mosi, kind: 'spi' });
    reserved.push({ componentId: boardPin, pin: 'MISO', boardPin: spec.spi.miso, kind: 'spi' });
    reserved.push({ componentId: boardPin, pin: 'SCK', boardPin: spec.spi.sck, kind: 'spi' });
    reserved.push({ componentId: boardPin, pin: 'CS', boardPin: spec.spi.cs, kind: 'spi' });
    used.add(spec.i2c.sda);
    used.add(spec.i2c.scl);
    used.add(spec.spi.mosi);
    used.add(spec.spi.miso);
    used.add(spec.spi.sck);
    used.add(spec.spi.cs);

    const popFirst = (arr: string[]): string | null => {
      for (const p of arr) {
        if (!used.has(p)) {
          used.add(p);
          return p;
        }
      }
      return null;
    };

    for (const c of components) {
      if (c.id === boardPin) continue;
      const meta = this.catalog.getComponent(c.type);
      if (!meta) continue;
      const pins: string[] = this.inferComponentPins(c.type, meta);
      for (const pin of pins) {
        const kind = this.classifyPin(pin);
        const boardChoice = this.chooseBoardPin(pin, kind, spec, popFirst);
        if (!boardChoice) continue;
        alloc.push({ componentId: c.id, pin, boardPin: boardChoice, kind });
      }
    }

    return { board: boardId, pins: alloc, reserved, notes: '' };
  }

  private classifyPin(pin: string): PinKind {
    const upper = pin.toUpperCase();
    if (POWER_PINS.some((p) => upper === p.toUpperCase() || upper.startsWith(`${p.toUpperCase()}.`))) return 'power';
    if (GROUND_PINS.some((g) => upper === g.toUpperCase() || upper.startsWith(`${g.toUpperCase()}.`))) return 'ground';
    if (I2C_PINS.includes(upper)) return 'i2c';
    if (SPI_PINS.includes(upper)) return 'spi';
    if (UART_PINS.includes(upper)) return 'uart';
    if (ONEWIRE_PINS.includes(upper)) return 'onewire';
    if (PWM_HINT.includes(upper)) return 'pwm';
    if (upper.startsWith('A') && /^\d/.test(upper.slice(1))) return 'analog';
    return 'digital';
  }

  /**
   * components-metadata.json does not list pin names per component — it
   * describes attributes. The allocator therefore uses a small static
   * fallback table for well-known components keyed by tag/type. New
   * component support goes HERE in one place, not in every prompt.
   */
  private inferComponentPins(
    type: string,
    meta: { tagName?: string } | null,
  ): string[] {
    if (Array.isArray((meta as any)?.pins)) return (meta as any).pins as string[];
    const tag = (meta?.tagName ?? type).toLowerCase();
    if (tag.includes('servo')) return ['PWM', 'V+', 'GND'];
    if (tag.includes('rgb-led')) return ['R', 'G', 'B', 'COM'];
    if (tag.includes('led-ring') || tag.includes('neopixel') || tag.includes('ws2812')) return ['DIN', 'VCC', 'GND'];
    if (tag.includes('led')) return ['A', 'C'];
    if (tag.includes('dht')) return ['SDA', 'VCC', 'GND', 'NC'];
    if (tag.includes('hc-sr04') || tag.includes('ultrasonic')) return ['VCC', 'TRIG', 'ECHO', 'GND'];
    if (tag.includes('potentiometer') || tag.includes('pot')) return ['SIG', 'VCC', 'GND'];
    if (tag.includes('pushbutton') || tag.includes('button')) return ['1.l', '2.l', '1.r', '2.r'];
    if (tag.includes('buzzer')) return ['1', '2'];
    if (tag.includes('hx711')) return ['GND', 'VCC', 'SCK', 'DT'];
    if (tag.includes('mpu6050')) return ['SDA', 'SCL', 'VCC', 'GND', 'INT', 'AD0'];
    if (tag.includes('bmp280')) return ['SDA', 'SCL', 'VCC', 'GND'];
    if (tag.includes('rtc') || tag.includes('ds1307') || tag.includes('ds3231')) return ['SDA', 'SCL', 'VCC', 'GND'];
    if (tag.includes('lcd1602') || tag.includes('lcd2004') || tag.includes('lcd')) return ['SDA', 'SCL', 'VCC', 'GND'];
    if (tag.includes('ssd1306') || tag.includes('oled')) return ['DATA', 'CLK', 'VIN', '3V3', 'GND', 'RST', 'DC', 'CS'];
    if (tag.includes('microsd') || tag.includes('sd-card')) return ['DI', 'DO', 'SCK', 'CS', 'VCC', 'GND', 'CD'];
    if (tag.includes('resistor')) return ['1', '2'];
    return [];
  }

  private chooseBoardPin(
    pin: string,
    kind: PinKind,
    spec: BoardPinSpec,
    popFirst: (arr: string[]) => string | null,
  ): string | null {
    const upper = pin.toUpperCase();
    if (kind === 'power') {
      // 3.3V components prefer 3V3, 5V components prefer 5V. We can't
      // know voltage here, default to 5V.
      return spec.power[0] ?? null;
    }
    if (kind === 'ground') {
      return spec.ground[0] ?? null;
    }
    if (kind === 'i2c') {
      return upper === 'SDA' ? spec.i2c.sda : spec.i2c.scl;
    }
    if (kind === 'spi') {
      if (upper === 'MOSI') return spec.spi.mosi;
      if (upper === 'MISO') return spec.spi.miso;
      if (upper === 'SCK') return spec.spi.sck;
      if (upper === 'CS' || upper === 'SS') return spec.spi.cs;
    }
    if (kind === 'pwm') {
      return popFirst(spec.pwm) ?? popFirst(spec.digital);
    }
    if (kind === 'analog' || kind === 'onewire') {
      return popFirst(spec.analog) ?? popFirst(spec.digital);
    }
    return popFirst(spec.digital);
  }
}
