// PinAllocator output types. Created in Phase 8 but defined early so the
// prompt modules can type-check.

import { BoardId } from '../planner/types';

export type PinKind = 'digital' | 'analog' | 'pwm' | 'i2c' | 'spi' | 'uart' | 'onewire' | 'power' | 'ground';

export interface PinAllocation {
  /** Component id from the planned list (e.g. "led-status"). */
  componentId: string;
  /** Pin label on the component, e.g. "A", "SIG", "SCL". */
  pin: string;
  /** Board pin the component pin is wired to, e.g. "9", "A0", "D13". */
  boardPin: string;
  kind: PinKind;
}

export interface AllocationResult {
  board: BoardId;
  pins: PinAllocation[];
  /** Pins reserved by the board for protocols (I2C, SPI, ...). */
  reserved: PinAllocation[];
  /** Free-form notes about why pins were chosen. */
  notes: string;
}
