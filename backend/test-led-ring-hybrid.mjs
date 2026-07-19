// Regression test: LLM was producing a hybrid "led" component with led-ring
// properties (pixels) bolted on, and with type 'led' but NeoPixel wiring.
// The fixers should normalize this to a proper 'led-ring' component.

import { validateProject } from './api/generate.ts';
import {
  resolveComponentsFromPrompt,
  fixComponentTypesFromWiring,
  normalizeConnectionPins,
} from './catalogHelpers.ts';

let failures = 0;
function assertEq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    console.error(`FAIL ${label}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
    failures++;
  } else {
    console.log(`PASS ${label}`);
  }
}

const prompt = 'make something cool with led ring and arduino uno\n';

// 1. The exact bad shape the LLM emitted: type "led" with led-ring props.
let bad = [
  { id: 'arduino-uno', type: 'arduino-uno', x: -160, y: 125 },
  {
    id: 'ledring1',
    type: 'led',
    x: 200,
    y: 100,
    properties: {
      value: false,
      brightness: 1,
      color: 'red',
      lightColor: null,
      label: '',
      flip: false,
      pixels: 12,
    },
  },
];

const fixed = resolveComponentsFromPrompt(prompt, bad);
assertEq('bad led upgraded to led-ring', fixed[1].type, 'led-ring');
assertEq('led-only props stripped', fixed[1].properties, { pixels: 12 });

// 2. rgb-led case (existing behaviour preserved).
const rgb = [
  { id: 'arduino-uno', type: 'arduino-uno', x: 100, y: 100 },
  { id: 'ledring1', type: 'rgb-led', x: 200, y: 100 },
];
const rgbFixed = resolveComponentsFromPrompt(prompt, rgb);
assertEq('rgb-led upgraded to led-ring', rgbFixed[1].type, 'led-ring');
assertEq('rgb-led gets pixels=12', rgbFixed[1].properties.pixels, 12);

// 3. Plain led with non-ring prompt: only the led properties survive,
// no `pixels` leaks in.
const plain = [
  { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
  {
    id: 'led1',
    type: 'led',
    x: 100,
    y: 0,
    properties: { color: 'red', brightness: 1, pixels: 12 },
  },
];
const plainFixed = resolveComponentsFromPrompt('blink an led on pin 13', plain);
assertEq('plain led type unchanged', plainFixed[1].type, 'led');
assertEq('plain led pixels stripped', plainFixed[1].properties, { color: 'red', brightness: 1 });

// 4. fixComponentTypesFromWiring: even without a ring prompt, a type=led
// with NeoPixel wiring should be upgraded.
const conns = [
  { from: 'arduino-uno:6', to: 'ledring1:DIN' },
  { from: 'arduino-uno:5V', to: 'ledring1:VCC' },
  { from: 'arduino-uno:GND.1', to: 'ledring1:GND' },
];
let wired = [
  { id: 'arduino-uno', type: 'arduino-uno', x: 0, y: 0 },
  {
    id: 'ledring1',
    type: 'led',
    x: 0,
    y: 0,
    properties: { color: 'red', pixels: 12, brightness: 1 },
  },
];
wired = fixComponentTypesFromWiring(wired, conns);
normalizeConnectionPins(conns, wired);
assertEq('wiring-driven upgrade to led-ring', wired[1].type, 'led-ring');
assertEq('wiring strips led-only props', wired[1].properties, { pixels: 12 });
assertEq('wiring DI -> DIN', conns[0].to, 'ledring1:DIN');
assertEq('wiring 5V -> VCC', conns[1].to, 'ledring1:VCC');

// 5. End-to-end validation: the project should be valid after the fixers.
const final = await validateProject({
  projectMetadata: { name: 'test' },
  components: fixed,
  connections: conns,
  firmware: { code: '' },
});
assertEq('e2e valid', final.valid, true);
if (!final.valid) console.error(final.errors);

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
