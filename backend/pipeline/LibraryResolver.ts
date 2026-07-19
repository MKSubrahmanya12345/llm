// LibraryResolver — derives the list of Arduino/ESP libraries required by
// a project. Replaces the hard-coded `if servo / if oled / if lcd` block
// that used to live at the bottom of generate.ts.
//
// Rules come from a small static map keyed by component tag. New
// component → library mappings are added in ONE place (this file) instead
// of scattered through a 50 KB file.

import type { ComponentInstance } from '../types';

interface LibraryRule {
  /** Match a component type (case-insensitive). */
  match: RegExp;
  /** Library names to add. */
  libs: string[];
}

/** Order matters: first match wins. Keep generic patterns last. */
const RULES: LibraryRule[] = [
  { match: /lcd1602|lcd2004|lcd\b/i, libs: ['LiquidCrystal I2C', 'Wire'] },
  { match: /ssd1306|oled/i, libs: ['Adafruit SSD1306', 'Adafruit GFX Library', 'Adafruit BusIO', 'Wire'] },
  { match: /servo/i, libs: ['Servo'] },
  { match: /dht/i, libs: ['DHT sensor library', 'Adafruit Unified Sensor'] },
  { match: /mpu6050|mpu/i, libs: ['Adafruit MPU6050', 'Adafruit Unified Sensor', 'Adafruit BusIO', 'Wire'] },
  { match: /bmp280|bmp/i, libs: ['Adafruit BMP280 Library', 'Adafruit Unified Sensor', 'Adafruit BusIO', 'Wire'] },
  { match: /ds1307|ds3231|rtc/i, libs: ['RTClib', 'Wire'] },
  { match: /neopixel|led-ring|ws2812/i, libs: ['Adafruit NeoPixel'] },
  { match: /hc-sr04|ultrasonic/i, libs: ['NewPing'] },
  { match: /hx711/i, libs: ['HX711 Arduino Library'] },
];

export class LibraryResolver {
  /** Returns a de-duplicated list of library names for the given components. */
  resolve(components: ComponentInstance[]): string[] {
    const out = new Set<string>();
    for (const c of components) {
      for (const rule of RULES) {
        if (rule.match.test(c.type)) {
          for (const lib of rule.libs) out.add(lib);
          break;
        }
      }
    }
    // Wire is implied whenever a board is present and I2C rules fired.
    if (out.size > 0 && !out.has('Wire')) {
      // leave as-is: only I2C devices need Wire; do not add it unconditionally.
    }
    return [...out];
  }
}
