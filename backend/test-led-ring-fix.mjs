import { validateProject } from './api/generate.ts';
import {
  resolveComponentsFromPrompt,
  fixComponentTypesFromWiring,
  normalizeConnectionPins,
} from './catalogHelpers.ts';

const prompt = 'make me something cool with led ring and arduino uno\n';

let components = [
  { id: 'arduino-uno', type: 'arduino-uno', x: 100, y: 100 },
  { id: 'ledring1', type: 'rgb-led', x: 200, y: 100 },
];

components = resolveComponentsFromPrompt(prompt, components);
console.log('After resolveComponentsFromPrompt:', components);

const connections = [
  { from: 'arduino-uno:D6', to: 'ledring1:DI' },
  { from: 'arduino-uno:5V', to: 'ledring1:5V' },
  { from: 'arduino-uno:GND.1', to: 'ledring1:GND' },
];

components = fixComponentTypesFromWiring(components, connections);
normalizeConnectionPins(connections, components);

console.log('Normalized connections:', JSON.stringify(connections, null, 2));

const result = await validateProject({
  projectMetadata: { name: 'test' },
  components,
  connections,
  firmware: { code: '' },
});

console.log('Valid:', result.valid);
if (!result.valid) {
  console.log('Errors:', result.errors);
  process.exit(1);
}

console.log('All checks passed.');
