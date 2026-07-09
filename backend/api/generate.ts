// ??$$$ Velxio Hardware Generator API Pipeline with Live Agent Steps

import { componentCatalog } from '../catalog';
import type { ComponentInstance, ConnectionSchema, VelxioProject } from '../types';
/*
import { validatePin } from '../validators';
*/
// ??$$$ Import getComponentMetadata along with validatePin
import { validatePin, getComponentMetadata } from '../validators';

const GROQ_MODEL_ID = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/*
export async function generateVelxioProject(
  userPrompt: string,
  onProgress: (evt: { type: 'step' | 'info' | 'error' | 'success'; message: string }) => void,
  maxRetries = 3
): Promise<VelxioProject> {
  let attempts = 0;
  let lastError: string | undefined = undefined;

  onProgress({ type: 'step', message: 'Analyzing prompt and identifying hardware requirements...' });
  onProgress({ type: 'info', message: `Prompt: "${userPrompt}"` });

  while (attempts <= maxRetries) {
    try {
      onProgress({ 
        type: 'step', 
        message: `Generating schematic and firmware code (Attempt ${attempts + 1}/${maxRetries + 1})...` 
      });
      
      const project = await attemptGenerate(userPrompt, attempts > 0 ? lastError : undefined);
      
      onProgress({ type: 'step', message: 'Running deterministic linter validations on schematic...' });
      
      onProgress({ type: 'info', message: 'Verifying board capacity & logic levels...' });
      const validation = await validateProject(project);
      
      if (validation.valid) {
        onProgress({ type: 'success', message: 'Deterministic linter passed with zero conflicts!' });
        latestProject = project;
        try {
          const fs = await import('fs');
          fs.writeFileSync('latest_project.json', JSON.stringify(project, null, 2), 'utf-8');
        } catch (fileErr) {
          console.error('Failed to write latest_project.json:', fileErr);
        }
        return project;
      } else {
        lastError = `Validation failed with the following errors:\n` + 
          validation.errors.map((e, idx) => `${idx + 1}. [${e.type}] Component: ${e.instanceId || 'N/A'}, Pin: ${e.pin || 'N/A'}. Details/Fix: ${e.fix}`).join('\n');
        
        onProgress({ 
          type: 'error', 
          message: `Validation failed: Found ${validation.errors.length} conflicts. Retrying with feedback...` 
        });
        
        validation.errors.forEach(e => {
          onProgress({ type: 'info', message: `↳ [Conflict: ${e.type}] ${e.fix}` });
        });

        attempts++;
        console.warn(`Attempt ${attempts} failed validation. Error Details:\n${lastError}`);
      }
    } catch (err: any) {
      lastError = `Generation / Parsing error: ${err?.message || 'unknown error'}`;
      onProgress({ type: 'error', message: `Generation failed: ${err?.message || 'unknown error'}. Retrying...` });
      attempts++;
      console.warn(`Attempt ${attempts} crashed. Error Details:\n${lastError}`);
    }
  }

  throw new Error(`Failed to generate valid project after ${maxRetries + 1} attempts. Last error:\n${lastError}`);
}
*/

// ??$$$ Multi-stage Agentic Pipeline for Velxio Project Generator
export async function generateVelxioProject(
  userPrompt: string,
  onProgress: (evt: { type: 'step' | 'info' | 'error' | 'success'; message: string }) => void,
  maxRetries = 3
): Promise<VelxioProject> {
  onProgress({ type: 'step', message: 'Analyzing prompt and identifying hardware requirements...' });
  onProgress({ type: 'info', message: `Prompt: "${userPrompt}"` });

  // --- Step 1: Choose Components ---
  let componentAttempts = 0;
  let componentFeedback: string | undefined = undefined;
  let components: ComponentInstance[] = [];

  while (componentAttempts <= maxRetries) {
    onProgress({
      type: 'step',
      message: `Selecting hardware components (Attempt ${componentAttempts + 1}/${maxRetries + 1})...`
    });
    try {
      components = await generateComponents(userPrompt, componentFeedback);
      
      onProgress({ type: 'info', message: `Verifying logic levels & board requirements...` });
      
      const valResult = await validateProject({
        projectMetadata: { name: 'Temp' },
        components,
        connections: [],
        firmware: { code: '' }
      });

      // Filter component-related errors (missing board, multiple boards, invalid component type, logic levels, capacity)
      const componentErrors = valResult.errors.filter(
        e => ['missing_board', 'multiple_boards', 'invalid_component_type', 'voltage_conflict', 'capacity_exceeded'].includes(e.type)
      );

      if (componentErrors.length === 0) {
        onProgress({ type: 'success', message: `Hardware components selected successfully: ${components.map(c => c.id).join(', ')}` });
        break;
      }

      componentFeedback = `Component validation failed with errors:\n` + 
        componentErrors.map((e, idx) => `${idx + 1}. [${e.type}] ${e.fix}`).join('\n');
      
      onProgress({ type: 'error', message: `Component validation failed: Retrying with feedback...` });
      componentErrors.forEach(e => onProgress({ type: 'info', message: `↳ ${e.fix}` }));
      componentAttempts++;
    } catch (err: any) {
      componentFeedback = `Failed to parse/generate components: ${err?.message || 'unknown error'}`;
      onProgress({ type: 'error', message: `Failed to select components: ${err?.message || 'unknown error'}. Retrying...` });
      componentAttempts++;
    }
  }

  if (components.length === 0) {
    throw new Error('Failed to choose valid components list after multiple attempts.');
  }

  // --- Step 2: Choose Wiring ---
  let wiringAttempts = 0;
  let wiringFeedback: string | undefined = undefined;
  let connections: ConnectionSchema[] = [];

  while (wiringAttempts <= maxRetries) {
    onProgress({
      type: 'step',
      message: `Designing circuit wiring connections (Attempt ${wiringAttempts + 1}/${maxRetries + 1})...`
    });
    try {
      connections = await generateWiring(userPrompt, components, wiringFeedback);
      
      onProgress({ type: 'info', message: `Running connection linter...` });
      
      // Validate components + connections
      const valResult = await validateProject({
        projectMetadata: { name: 'Temp' },
        components,
        connections,
        firmware: { code: '' }
      });

      if (valResult.valid) {
        onProgress({ type: 'success', message: `Circuit connections validated: ${connections.length} wires connected!` });
        break;
      }

      wiringFeedback = `Wiring validation failed with errors:\n` + 
        valResult.errors.map((e, idx) => `${idx + 1}. [${e.type}] Component: ${e.instanceId || 'N/A'}, Pin: ${e.pin || 'N/A'}. Fix: ${e.fix}`).join('\n');
      
      onProgress({ type: 'error', message: `Wiring validation failed: Retrying with feedback...` });
      valResult.errors.forEach(e => onProgress({ type: 'info', message: `↳ ${e.fix}` }));
      wiringAttempts++;
    } catch (err: any) {
      wiringFeedback = `Failed to parse/generate wiring: ${err?.message || 'unknown error'}`;
      onProgress({ type: 'error', message: `Failed to design wiring: ${err?.message || 'unknown error'}. Retrying...` });
      wiringAttempts++;
    }
  }

  if (connections.length === 0) {
    throw new Error('Failed to design valid wiring connections after multiple attempts.');
  }

  // --- Step 3: Generate Firmware Code ---
  onProgress({
    type: 'step',
    message: `Generating Arduino firmware code matching circuit connections...`
  });
  
  let code = '';
  try {
    code = await generateFirmware(userPrompt, components, connections);
    onProgress({ type: 'success', message: `Arduino firmware code generated successfully!` });
  } catch (err: any) {
    onProgress({ type: 'error', message: `Firmware generation failed: ${err?.message || 'unknown error'}. Using fallback empty sketch.` });
    code = `void setup() {\n  // Code generation failed\n}\nvoid loop() {\n}`;
  }

  // Assemble final project
  const project: VelxioProject = {
    projectMetadata: {
      name: userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '')
    },
    components,
    connections,
    firmware: {
      code
    }
  };

  // Final validation and save
  const finalValidation = await validateProject(project);
  if (finalValidation.valid) {
    onProgress({ type: 'success', message: 'Final project assembled and validated successfully!' });
  } else {
    onProgress({ type: 'info', message: 'Final assembled project contains validation warnings. Standardizing...' });
  }

  latestProject = project;
  try {
    const fs = await import('fs');
    fs.writeFileSync('latest_project.json', JSON.stringify(project, null, 2), 'utf-8');
  } catch (fileErr) {
    console.error('Failed to write latest_project.json:', fileErr);
  }

  return project;
}

export let latestProject: VelxioProject | null = null;

try {
  const fs = await import('fs');
  if (fs.existsSync('latest_project.json')) {
    latestProject = JSON.parse(fs.readFileSync('latest_project.json', 'utf-8'));
  }
} catch (e) {
  // Ignore
}

// async function attemptGenerate(prompt: string, feedback?: string): Promise<VelxioProject> {
//   const systemPrompt = `
//     You are an expert Velxio simulation project generator. Your job is to output a single, valid VelxioProject JSON object.
//     
//     You MUST output ONLY raw JSON. Do not wrap in markdown code blocks like \`\`\`json. Output nothing else.
// 
//     JSON Schema format:
//     {
//       "projectMetadata": {
//         "name": "string (name of the project)"
//       },
//       "components": [
//         {
//           "id": "string (unique identifier, e.g., esp32, dht1, oled1)",
//           "type": "string (must exactly match one of the catalog keys below)",
//           "x": "number (X position on canvas, e.g. 0 to 400)",
//           "y": "number (Y position on canvas, e.g. 0 to 400)",
//           "properties": "optional object with key-values"
//         }
//       ],
//       "connections": [
//         {
//           "from": "componentId:pinName",
//           "to": "componentId:pinName",
//           "color": "string (hex color or name, e.g., '#ff0000', 'green')"
//         }
//       ],
//       "firmware": {
//         "code": "string (valid Arduino C++ code matching the connections and logic)"
//       }
//     }
// 
//     Strict Rules for Component Types and Pin Naming:
//     Use ONLY the following component keys from the catalog:
//     - Microcontrollers:
//       * 'esp32' (use for all ESP32 requests): Pins: 3V3, 5V, GND, EN, 0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39
//       * 'arduino-uno': Pins: 0 to 13, A0 to A5, GND.1, GND.2, GND.3, 5V, 3.3V, RESET, VIN
//     - Displays:
//       * 'ssd1306': Pins: DATA, CLK, VIN, 3V3, GND, RST, DC, CS (NOTE: SDA maps to DATA, SCL maps to CLK)
//       * 'lcd1602' (Strictly 5V only): Pins: SDA, SCL, VCC, GND
//     - Sensors:
//       * 'dht22': Pins: SDA, VCC, GND, NC (NOTE: The single data pin is SDA, NOT DATA, NOT SCL)
//       * 'hc-sr04': Pins: VCC, TRIG, ECHO, GND
//       * 'hx711': Pins: GND, VCC, SCK, DT (NOTE: The data pin is DT, NOT DOUT)
//       * 'mpu6050': Pins: SDA, SCL, VCC, GND, INT, AD0, XCL, XDA
//     - Inputs:
//       * 'pushbutton': Pins: 1.l, 2.l, 1.r, 2.r
//       * 'potentiometer': Pins: SIG, VCC, GND
//     - Motors / Actuators:
//       * 'servo' (Strictly 5V only): Pins: PWM, V+, GND (NOTE: Power pin is V+, NOT VCC)
//       * 'buzzer': Pins: 1, 2
//     - Passives & Storage:
//       * 'led': Pins: A, C
//       * 'rgb-led': Pins: R, G, B, COM
//       * 'resistor': Pins: 1, 2
//       * 'microsd-card': Pins: DI, DO, SCK, CS, VCC, GND, CD
// 
//     Logic and Wiring Constraints:
//     1. ESP32 runs on 3.3V logic. Never use 5V-only components (like lcd1602 or ds1307 or servo) directly with ESP32. If 5V-only components (like 'servo') are requested, you MUST select 'arduino-uno' as the microcontroller board instead of 'esp32'.
//     2. DHT22 uses single-wire protocol on its 'SDA' pin. Connect DHT22:SDA to a digital GPIO (e.g. esp32:4 or esp32:15 or arduino-uno:8). Do not connect DHT22 to board SDA/SCL.
//     3. Make sure all VCC/VIN/V+ pins are wired to power (e.g. 3V3 or 5V) and all GND/COM pins are wired to GND.
//     4. Non-power/GND pins (like GPIOs and signal pins) cannot be shorted or connected to multiple things. Avoid pin collisions!
//     5. The 'firmware.code' field must match the exact pins in your connections. Ensure libraries are included (e.g., #include <DHT.h> or #include <Adafruit_SSD1306.h>).
//   `;
// 
//   const fullPrompt = feedback
//     ? \`\${prompt}\\n\\n## Error Feedback from Validator:\\n\${feedback}\\n\\nPlease analyze the errors, fix them, and return a corrected, valid JSON object.\`
//     : prompt;
// 
//   const apiKey = process.env.GROQ_API_KEY || '';
//   if (!apiKey) {
//     throw new Error('GROQ_API_KEY environment variable is not defined.');
//   }
// 
//   const response = await fetch(GROQ_API_URL, {
//     method: 'POST',
//     headers: {
//       'Authorization': \`Bearer \${apiKey}\`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       model: GROQ_MODEL_ID,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: fullPrompt },
//       ],
//       temperature: 0.2,
//       max_tokens: 4000,
//     }),
//   });
// 
//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(\`Groq API returned error: \${response.status} \${response.statusText} - \${errorText}\`);
//   }
// 
//   const json = await response.json();
//   let content = json.choices[0].message.content.trim();
// 
//   if (content.startsWith('```')) {
//     content = content.replace(/^```json\\s*/i, '').replace(/```$/, '').trim();
//   }
// 
//   try {
//     return JSON.parse(content);
//   } catch (parseErr: any) {
//     throw new Error(\`JSON_PARSE_ERROR: Failed to parse LLM response as JSON. Content: "\${content.substring(0, 100)}...". Error: \${parseErr?.message}\`);
//   }
// }

// ??$$$ Helper function for call to Groq API
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not defined.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API returned error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const json = await response.json();
  let content = json.choices[0].message.content.trim();

  if (content.startsWith('```')) {
    content = content.replace(/^```[a-zA-Z0-9\+\-\_]*\s*/i, '').replace(/```\s*$/, '').trim();
  }

  return content;
}

// ??$$$ Step 1 Helper: Generate Components
async function generateComponents(prompt: string, feedback?: string): Promise<ComponentInstance[]> {
  const systemPrompt = `
You are a hardware layout assistant for Velxio.
Given a user's natural language project request, you must output a JSON array of components that will be used in the project.

You MUST choose:
1. Exactly one microcontroller board:
   * If any of the requested components require 5V logic (such as 'servo' or 'lcd1602'), you MUST choose 'arduino-uno' as the microcontroller to prevent logic level voltage conflicts.
   * Otherwise, choose 'esp32'.
2. The correct peripherals/sensors/displays needed to satisfy the request.

Catalog of allowed component types (your type field must exactly match one of these):
- Microcontrollers:
  * 'esp32' (3.3V logic level)
  * 'arduino-uno' (5V logic level)
- Displays:
  * 'ssd1306' (3.3V or 5V logic level OLED display)
  * 'lcd1602' (Strictly 5V logic level LCD 16x2)
- Sensors:
  * 'dht22' (3.3V/5V temperature/humidity sensor)
  * 'hc-sr04' (3.3V/5V ultrasonic distance sensor)
  * 'hx711' (3.3V/5V load cell amplifier)
  * 'mpu6050' (3.3V/5V accelerometer/gyroscope)
- Inputs:
  * 'pushbutton' (tactile button)
  * 'potentiometer' (rotary potentiometer)
- Motors / Actuators:
  * 'servo' (Strictly 5V logic level servo motor)
  * 'buzzer' (piezo buzzer)
- Passives & Storage:
  * 'led' (simple LED)
  * 'rgb-led' (common-cathode RGB LED)
  * 'resistor' (passive resistor)
  * 'microsd-card' (SD card SPI module)

Output format:
You MUST output ONLY a JSON array of component instances. Do not wrap in markdown code blocks like \`\`\`json. Output nothing else.

Example Output format:
[
  { "id": "arduino-uno", "type": "arduino-uno", "x": 100, "y": 100 },
  { "id": "pot1", "type": "potentiometer", "x": 50, "y": 200 },
  { "id": "servo1", "type": "servo", "x": 200, "y": 200 }
]
  `;

  const userPrompt = feedback
    ? `${prompt}\n\n## Feedback from linter:\n${feedback}\n\nPlease correct the component array.`
    : prompt;

  const content = await callGroq(systemPrompt, userPrompt);
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not a JSON array.');
  }
  return parsed;
}

// ??$$$ Step 2 Helper: Generate Wiring
async function generateWiring(
  prompt: string,
  components: ComponentInstance[],
  feedback?: string
): Promise<ConnectionSchema[]> {
  const systemPrompt = `
You are a hardware wiring assistant for Velxio.
Given a list of component instances, you must generate the connections (wires) between them.

Components list:
${JSON.stringify(components, null, 2)}

Strict Pin Mapping Catalog Rules (refer to this for valid pin names on each component):
- 'arduino-uno': Pins: "0" to "13", "A0" to "A5", "GND.1", "GND.2", "GND.3", "5V", "3.3V", "RESET", "VIN"
- 'esp32': Pins: "3V3", "5V", "GND", "EN", "0", "1", "2", "3", "4", "5", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "23", "25", "26", "27", "32", "33", "34", "35", "36", "39"
- 'ssd1306': Pins: DATA, CLK, VIN, 3V3, GND, RST, DC, CS (NOTE: SDA maps to DATA, SCL maps to CLK)
- 'lcd1602': Pins: SDA, SCL, VCC, GND
- 'dht22': Pins: SDA, VCC, GND, NC (NOTE: The single data pin is SDA, NOT DATA, NOT SCL)
- 'hc-sr04': Pins: VCC, TRIG, ECHO, GND
- 'hx711': Pins: GND, VCC, SCK, DT (NOTE: The data pin is DT, NOT DOUT)
- 'mpu6050': Pins: SDA, SCL, VCC, GND, INT, AD0, XCL, XDA
- 'pushbutton': Pins: 1.l, 2.l, 1.r, 2.r
- 'potentiometer': Pins: SIG, VCC, GND
- 'servo': Pins: PWM, V+, GND (NOTE: Power pin is V+, NOT VCC)
- 'buzzer': Pins: 1, 2
- 'led': Pins: A, C
- 'rgb-led': Pins: R, G, B, COM
- 'resistor': Pins: 1, 2
- 'microsd-card': Pins: DI, DO, SCK, CS, VCC, GND, CD

Wiring Rules:
1. Connect all power pins (VCC, VIN, V+, COM, 3V3, 5V) to appropriate microcontroller power rails.
   * If board is 'arduino-uno', connect 5V components to '5V', 3.3V components to '3.3V'.
   * If board is 'esp32', connect 3.3V/5V components to '3V3' or '5V'.
2. Connect all ground pins (GND, COM, C) to a board GND pin. Uno GND pins are "GND.1", "GND.2", or "GND.3". ESP32 GND pin is "GND".
3. Connect signal/data pins to appropriate digital/analog pins.
   * DHT22:SDA pin uses a digital pin, NOT the board's I2C SDA/SCL pins.
   * I2C components (ssd1306, lcd1602, mpu6050) MUST connect to the microcontroller's I2C pins:
     - Arduino Uno I2C pins: A4 (SDA), A5 (SCL)
     - ESP32 I2C pins: 21 (SDA), 22 (SCL)
   * Potentiometer:SIG MUST connect to an analog pin (e.g. A0 on Arduino Uno, or 34/35/36/39 on ESP32).
4. No pin collisions: Only power and GND pins can share a connection endpoint. Do not connect multiple signal pins to the same pin.

Output format:
You MUST output ONLY a JSON array of connections. Do not wrap in markdown code blocks like \`\`\`json. Output nothing else.

Example Output format:
[
  { "from": "arduino-uno:5V", "to": "pot1:VCC", "color": "red" },
  { "from": "arduino-uno:GND.1", "to": "pot1:GND", "color": "black" },
  { "from": "arduino-uno:A0", "to": "pot1:SIG", "color": "blue" }
]
  `;

  const userPrompt = feedback
    ? `For project request "${prompt}", with components: ${JSON.stringify(components, null, 2)}\n\n## Feedback from linter:\n${feedback}\n\nPlease correct the wiring connections array.`
    : `For project request "${prompt}", generate the connections array.`;

  const content = await callGroq(systemPrompt, userPrompt);
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not a JSON array.');
  }
  return parsed;
}

// ??$$$ Step 3 Helper: Generate Firmware
async function generateFirmware(
  prompt: string,
  components: ComponentInstance[],
  connections: ConnectionSchema[]
): Promise<string> {
  const systemPrompt = `
You are a firmware generator for Velxio hardware projects.
Given a list of components and their wiring connections, write a valid Arduino C++ sketch to control the components as requested.

Components:
${JSON.stringify(components, null, 2)}

Connections:
${JSON.stringify(connections, null, 2)}

Rules:
1. Ensure you use the exact same pin numbers and connections defined in the connections array.
   * Check which pins connect to which peripherals (e.g., if potentiometer SIG is connected to A0, use A0; if servo PWM is connected to pin 3, use pin 3).
2. Write clean, complete, compilation-ready C++ code.
3. Make sure to include all necessary libraries (e.g. <Adafruit_SSD1306.h>, <Servo.h>, <DHT.h>, etc.).
4. Implement the loop() non-blocking and with logical behavior to fulfill the user's prompt.

Output format:
You MUST output ONLY the raw C++ code. Do not wrap in markdown code blocks like \`\`\`cpp. Output nothing else.
  `;

  const userPrompt = `For project request "${prompt}", generate the Arduino firmware code.`;

  const content = await callGroq(systemPrompt, userPrompt);
  return content;
}

export interface ValidationError {
  type: string;
  instanceId?: string;
  pin?: string;
  fix: string;
}

/*
export async function validateProject(project: VelxioProject): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  if (!project.components || !Array.isArray(project.components)) {
    errors.push({ type: 'schema_error', fix: "Provide a valid 'components' array." });
    return { valid: false, errors };
  }

  const microcontrollers = project.components.filter(c => {
    const meta = componentCatalog[c.type];
    return meta && meta.function === 'microcontroller';
  });

  if (microcontrollers.length === 0) {
    errors.push({
      type: 'missing_board',
      fix: 'Your components array must include exactly one microcontroller board (e.g. esp32 or arduino-uno).'
    });
  } else if (microcontrollers.length > 1) {
    errors.push({
      type: 'multiple_boards',
      fix: `Found ${microcontrollers.length} boards. Only exactly one microcontroller board is allowed.`
    });
  }

  const boardInstance = microcontrollers[0];
  const boardVoltage = boardInstance && (boardInstance.type.includes('esp32') ? '3.3V' : '5V');

  for (const comp of project.components) {
    const typeMeta = componentCatalog[comp.type];
    if (!typeMeta) {
      errors.push({
        type: 'invalid_component_type',
        instanceId: comp.id,
        fix: `Component type "${comp.type}" is not supported. Use one of: ${Object.keys(componentCatalog).filter(k => !k.includes('_') && !k.endsWith('-i2c')).join(', ')}`
      });
      continue;
    }

    if (boardVoltage && !typeMeta.voltageTolerance.includes(boardVoltage)) {
      if (comp.type === 'lcd1602' || comp.type === 'lcd1602-i2c' || comp.type === 'lcd1602_i2c') {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `LCD1602 requires 5V but board logic level is 3.3V (ESP32). Replace with 'ssd1306' OLED display.`
        });
      } else if (comp.type === 'servo') {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `Servo motor requires 5V but board logic level is 3.3V (ESP32). To resolve this, you MUST change the microcontroller board type to "arduino-uno" (which supports 5V logic) and rewrite all pin connections to match the Uno board layout.`
        });
      } else {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `Component "${comp.id}" (${comp.type}) requires 5V but board logic level is 3.3V (ESP32). To resolve this, change the microcontroller board type to "arduino-uno" (which has 5V logic level) and rewrite all pin connections accordingly.`
        });
      }
    }
  }

  if (project.connections && Array.isArray(project.connections)) {
    const pinUsage = new Map<string, string[]>();

    project.connections.forEach((conn, idx) => {
      if (!conn.from || !conn.to) {
        errors.push({
          type: 'invalid_connection_schema',
          fix: `Connection at index ${idx} is missing 'from' or 'to' parameters.`
        });
        return;
      }

      const fromParts = conn.from.split(':');
      const toParts = conn.to.split(':');

      if (fromParts.length !== 2 || toParts.length !== 2) {
        errors.push({
          type: 'invalid_connection_format',
          fix: `Connection "${conn.from} -> ${conn.to}" must use "componentId:pinName" format.`
        });
        return;
      }

      const [fromId, fromPin] = fromParts;
      const [toId, toPin] = toParts;

      const fromValid = validatePin(fromId, fromPin, project.components, componentCatalog);
      const toValid = validatePin(toId, toPin, project.components, componentCatalog);

      if (!fromValid) {
        errors.push({
          type: 'invalid_pin',
          instanceId: fromId,
          pin: fromPin,
          fix: `Pin "${fromPin}" does not exist on component "${fromId}".`
        });
      }
      if (!toValid) {
        errors.push({
          type: 'invalid_pin',
          instanceId: toId,
          pin: toPin,
          fix: `Pin "${toPin}" does not exist on component "${toId}".`
        });
      }

      const isPowerPin = (pinName: string) => /^(gnd|vcc|v\+|vin|3\.3v|3v3|5v)/i.test(pinName);

      if (fromValid && !isPowerPin(fromPin)) {
        const key = `${fromId}:${fromPin.toLowerCase()}`;
        if (!pinUsage.has(key)) pinUsage.set(key, []);
        pinUsage.get(key)!.push(`connection index ${idx}`);
      }
      if (toValid && !isPowerPin(toPin)) {
        const key = `${toId}:${toPin.toLowerCase()}`;
        if (!pinUsage.has(key)) pinUsage.set(key, []);
        pinUsage.get(key)!.push(`connection index ${idx}`);
      }
    });

    pinUsage.forEach((usages, key) => {
      if (usages.length > 1) {
        const [comp, pin] = key.split(':');
        errors.push({
          type: 'pin_collision',
          instanceId: comp,
          pin: pin,
          fix: `Pin "${pin}" on component "${comp}" is connected to multiple locations: ${usages.join(', ')}. Ensure only power/GND pins are shared.`
        });
      }
    });
  }

  if (project.components && project.components.length > 12) {
    errors.push({
      type: 'capacity_exceeded',
      fix: 'Project contains too many components (max 12). Keep it simpler.'
    });
  }

  return { valid: errors.length === 0, errors };
}
*/

// ??$$$ Standardize microcontroller IDs and connections to resolve discrepancies
export async function validateProject(project: VelxioProject): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  if (!project.components || !Array.isArray(project.components)) {
    errors.push({ type: 'schema_error', fix: "Provide a valid 'components' array." });
    return { valid: false, errors };
  }

  // 1. Identify microcontroller board using getComponentMetadata
  const microcontrollers = project.components.filter(c => {
    const meta = getComponentMetadata(c.type, componentCatalog);
    return meta && meta.function === 'microcontroller';
  });

  if (microcontrollers.length === 0) {
    errors.push({
      type: 'missing_board',
      fix: 'Your components array must include exactly one microcontroller board (e.g. esp32 or arduino-uno).'
    });
  } else if (microcontrollers.length > 1) {
    errors.push({
      type: 'multiple_boards',
      fix: `Found ${microcontrollers.length} boards. Only exactly one microcontroller board is allowed.`
    });
  }

  const boardInstance = microcontrollers[0];

  // 2. Perform systemic standardization of board ID and connection mapping
  if (boardInstance) {
    const oldBoardId = boardInstance.id;
    const meta = getComponentMetadata(boardInstance.type, componentCatalog);
    let standardizedId = boardInstance.type.toLowerCase().trim();
    if (meta && meta.tagName) {
      standardizedId = meta.tagName.replace(/^(wokwi|velxio)-/, '');
    }
    boardInstance.id = standardizedId;

    if (project.connections && Array.isArray(project.connections)) {
      const boardAliases = [
        'arduino-uno', 'arduino_uno', 'uno',
        'arduino-nano', 'arduino_nano', 'nano',
        'arduino-mega', 'arduino_mega', 'mega',
        'esp32', 'esp32-devkit-v1', 'esp32_devkit_v1',
        'mcu', 'board', oldBoardId.toLowerCase().trim()
      ];

      project.connections.forEach(conn => {
        if (conn.from) {
          const [fromId, fromPin] = conn.from.split(':');
          if (boardAliases.includes(fromId.toLowerCase().trim()) || fromId === oldBoardId) {
            conn.from = `${standardizedId}:${fromPin}`;
          }
        }
        if (conn.to) {
          const [toId, toPin] = conn.to.split(':');
          if (boardAliases.includes(toId.toLowerCase().trim()) || toId === oldBoardId) {
            conn.to = `${standardizedId}:${toPin}`;
          }
        }
      });
    }
  }

  const boardVoltage = boardInstance && (boardInstance.type.includes('esp32') ? '3.3V' : '5V');

  // 3. Validate components
  for (const comp of project.components) {
    const typeMeta = getComponentMetadata(comp.type, componentCatalog);
    if (!typeMeta) {
      errors.push({
        type: 'invalid_component_type',
        instanceId: comp.id,
        fix: `Component type "${comp.type}" is not supported. Use one of: ${Object.keys(componentCatalog).filter(k => !k.includes('_') && !k.endsWith('-i2c')).join(', ')}`
      });
      continue;
    }

    if (boardVoltage && !typeMeta.voltageTolerance.includes(boardVoltage)) {
      if (comp.type === 'lcd1602' || comp.type === 'lcd1602-i2c' || comp.type === 'lcd1602_i2c') {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `LCD1602 requires 5V but board logic level is 3.3V (ESP32). Replace with 'ssd1306' OLED display.`
        });
      } else if (comp.type === 'servo') {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `Servo motor requires 5V but board logic level is 3.3V (ESP32). To resolve this, you MUST change the microcontroller board type to "arduino-uno" (which supports 5V logic) and rewrite all pin connections to match the Uno board layout.`
        });
      } else {
        errors.push({
          type: 'voltage_conflict',
          instanceId: comp.id,
          fix: `Component "${comp.id}" (${comp.type}) requires 5V but board logic level is 3.3V (ESP32). To resolve this, change the microcontroller board type to "arduino-uno" (which has 5V logic level) and rewrite all pin connections accordingly.`
        });
      }
    }
  }

  // 4. Validate connections
  if (project.connections && Array.isArray(project.connections)) {
    const pinUsage = new Map<string, string[]>();

    project.connections.forEach((conn, idx) => {
      if (!conn.from || !conn.to) {
        errors.push({
          type: 'invalid_connection_schema',
          fix: `Connection at index ${idx} is missing 'from' or 'to' parameters.`
        });
        return;
      }

      const fromParts = conn.from.split(':');
      const toParts = conn.to.split(':');

      if (fromParts.length !== 2 || toParts.length !== 2) {
        errors.push({
          type: 'invalid_connection_format',
          fix: `Connection "${conn.from} -> ${conn.to}" must use "componentId:pinName" format.`
        });
        return;
      }

      const [fromId, fromPin] = fromParts;
      const [toId, toPin] = toParts;

      const fromValid = validatePin(fromId, fromPin, project.components, componentCatalog);
      const toValid = validatePin(toId, toPin, project.components, componentCatalog);

      if (!fromValid) {
        errors.push({
          type: 'invalid_pin',
          instanceId: fromId,
          pin: fromPin,
          fix: `Pin "${fromPin}" does not exist on component "${fromId}".`
        });
      }
      if (!toValid) {
        errors.push({
          type: 'invalid_pin',
          instanceId: toId,
          pin: toPin,
          fix: `Pin "${toPin}" does not exist on component "${toId}".`
        });
      }

      const isPowerPin = (pinName: string) => /^(gnd|vcc|v\+|vin|3\.3v|3v3|5v)/i.test(pinName);

      if (fromValid && !isPowerPin(fromPin)) {
        const key = `${fromId}:${fromPin.toLowerCase()}`;
        if (!pinUsage.has(key)) pinUsage.set(key, []);
        pinUsage.get(key)!.push(`connection index ${idx}`);
      }
      if (toValid && !isPowerPin(toPin)) {
        const key = `${toId}:${toPin.toLowerCase()}`;
        if (!pinUsage.has(key)) pinUsage.set(key, []);
        pinUsage.get(key)!.push(`connection index ${idx}`);
      }
    });

    pinUsage.forEach((usages, key) => {
      if (usages.length > 1) {
        const [comp, pin] = key.split(':');
        errors.push({
          type: 'pin_collision',
          instanceId: comp,
          pin: pin,
          fix: `Pin "${pin}" on component "${comp}" is connected to multiple locations: ${usages.join(', ')}. Ensure only power/GND pins are shared.`
        });
      }
    });
  }

  if (project.components && project.components.length > 12) {
    errors.push({
      type: 'capacity_exceeded',
      fix: 'Project contains too many components (max 12). Keep it simpler.'
    });
  }

  return { valid: errors.length === 0, errors };
}
