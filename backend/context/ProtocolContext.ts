/**
 * Phase 2 - Protocol context.
 *
 * Groups requested components by which bus they need, so the prompt
 * can say "you have 1 I2C device, 2 PWM devices, 0 SPI devices" etc.
 */

import type { ComponentSummary, ProtocolBuckets } from './types';

const I2C_TAGS = ['i2c'];
const SPI_TAGS = ['spi'];
const PWM_TAGS = ['pwm', 'servo', 'analog', 'pwm-output'];
const UART_TAGS = ['uart', 'serial'];
const ONEWIRE_TAGS = ['onewire', '1-wire', '1wire', 'dht', 'ds18b20'];

function anyTagMatches(entry: ComponentSummary, candidates: string[]): boolean {
  const tags = entry.tags.map((t) => t.toLowerCase());
  const id = entry.id.toLowerCase();
  const name = entry.name.toLowerCase();
  return candidates.some((c) => {
    const k = c.toLowerCase();
    return tags.includes(k) || tags.some((t) => t.includes(k)) || id.includes(k) || name.includes(k);
  });
}

export class ProtocolContext {
  static bucket(components: ComponentSummary[]): ProtocolBuckets {
    return {
      i2c: components.filter((c) => anyTagMatches(c, I2C_TAGS)),
      spi: components.filter((c) => anyTagMatches(c, SPI_TAGS)),
      pwm: components.filter((c) => anyTagMatches(c, PWM_TAGS)),
      uart: components.filter((c) => anyTagMatches(c, UART_TAGS)),
      onewire: components.filter((c) => anyTagMatches(c, ONEWIRE_TAGS)),
    };
  }
}
