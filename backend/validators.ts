// ??$$$ Validations and conflict resolution logic for Velxio components/pins

import type { ComponentInstance } from './types';
import { componentCatalog } from './catalog';

export interface ComponentTypeMetadata {
  pins: string[];
  function: string;
  voltageTolerance: ('3.3V' | '5V')[];
  description?: string;
  tagName?: string;
}

export interface ComponentCatalog {
  [componentType: string]: ComponentTypeMetadata;
}

/**
 * Normalizes component type names by converting underscores to hyphens and lowercasing.
 */
/*
function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/_/g, '-');
}
*/

// ??$$$ Robust component metadata lookup helper
export function getComponentMetadata(type: string, catalog: ComponentCatalog): ComponentTypeMetadata | null {
  if (!type) return null;
  const t = type.toLowerCase().trim();
  
  if (catalog[type]) return catalog[type];
  if (catalog[t]) return catalog[t];

  const normType = t.replace(/_/g, '-');
  if (catalog[normType]) return catalog[normType];

  const stripped = normType.replace(/^(wokwi|velxio)-/, '');
  if (catalog[stripped]) return catalog[stripped];
  const strippedUnderscores = stripped.replace(/-/g, '_');
  if (catalog[strippedUnderscores]) return catalog[strippedUnderscores];

  for (const [key, meta] of Object.entries(catalog)) {
    if (meta.tagName) {
      const tag = meta.tagName.toLowerCase().trim();
      if (tag === t || tag === normType || tag.replace(/^(wokwi|velxio)-/, '') === stripped) {
        return meta;
      }
    }
  }

  return null;
}

// ??$$$ Wrapper for compatibility
function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/_/g, '-');
}

/*
export function validatePin(
  instanceId: string,
  pinId: string,
  instances: ComponentInstance[],
  catalog: ComponentCatalog
): boolean {
  const instance = instances.find(i => i.id === instanceId);
  if (!instance) {
    console.warn(`Unknown instance ID: "${instanceId}" in validatePin()`);
    return false;
  }

  const normType = normalizeType(instance.type);
  const typeMeta = catalog[instance.type] || catalog[normType];
  
  if (!typeMeta) {
    console.warn(`Unknown component type: "${instance.type}" (referenced by instance "${instanceId}")`);
    return false;
  }

  const targetPin = pinId.trim();
  const pinExists = typeMeta.pins.some(p => p.toLowerCase() === targetPin.toLowerCase());

  if (!pinExists) {
    console.warn(`Pin "${pinId}" not found on ${instance.type}. Available: ${typeMeta.pins.join(', ')}`);
    return false;
  }
  return true;
}
*/

// ??$$$ Refactored validatePin supporting board identification and pin mapping
export function validatePin(
  instanceId: string,
  pinId: string,
  instances: ComponentInstance[],
  catalog: ComponentCatalog
): boolean {
  let instance = instances.find(i => i.id === instanceId);

  // Find the microcontroller board if it exists
  const boardInstance = instances.find(i => {
    const meta = getComponentMetadata(i.type, catalog);
    return meta && meta.function === 'microcontroller';
  });

  if (!instance && boardInstance) {
    const normId = instanceId.toLowerCase().trim();
    const boardAliases = [
      'arduino-uno', 'arduino_uno', 'uno',
      'arduino-nano', 'arduino_nano', 'nano',
      'arduino-mega', 'arduino_mega', 'mega',
      'esp32', 'esp32-devkit-v1', 'esp32_devkit_v1',
      'mcu', 'board'
    ];
    if (boardAliases.includes(normId) || normId.startsWith('esp32') || normId.startsWith('arduino') || normId === boardInstance.id.toLowerCase().trim()) {
      instance = boardInstance;
    }
  }

  if (!instance) {
    console.warn(`Unknown instance ID: "${instanceId}" in validatePin()`);
    return false;
  }

  const typeMeta = getComponentMetadata(instance.type, catalog);
  
  if (!typeMeta) {
    console.warn(`Unknown component type: "${instance.type}" (referenced by instance "${instanceId}")`);
    return false;
  }

  const targetPin = pinId.trim();
  const pinExists = typeMeta.pins.some(p => p.toLowerCase() === targetPin.toLowerCase());

  if (!pinExists) {
    console.warn(`Pin "${pinId}" not found on ${instance.type}. Available: ${typeMeta.pins.join(', ')}`);
    return false;
  }
  return true;
}

export interface VoltageConflictResult {
  outcome: 'keep' | 'fallback' | 'clarify';
  componentId: string;
  message?: string;
  fallbackInstance?: ComponentInstance;
}

/**
 * Resolves voltage incompatibility issues by finding an alternative component from the catalog.
 */
export function resolveVoltageConflict(
  requestedComponentId: string,
  instances: ComponentInstance[],
  catalog: ComponentCatalog,
  boardVoltage: '3.3V' | '5V'
): VoltageConflictResult {
  const instance = instances.find(i => i.id === requestedComponentId);
  if (!instance) {
    return { outcome: 'clarify', componentId: requestedComponentId, message: 'Component instance not found.' };
  }

  const normType = normalizeType(instance.type);
  const typeMeta = catalog[instance.type] || catalog[normType];
  if (!typeMeta) {
    return { outcome: 'clarify', componentId: requestedComponentId, message: 'Component type not in catalog.' };
  }

  const isVoltageCompatible = typeMeta.voltageTolerance.includes(boardVoltage);
  if (isVoltageCompatible) {
    return { outcome: 'keep', componentId: requestedComponentId };
  }

  const { fallbackType, reason } = selectFallbackType(typeMeta, catalog, boardVoltage);
  if (!fallbackType) {
    return {
      outcome: 'clarify',
      componentId: requestedComponentId,
      message: `${requestedComponentId} (${instance.type}) is incompatible with ${boardVoltage} and no compatible fallback was found.`,
    };
  }

  const fallbackInstance = createFallbackInstance(instance, fallbackType, catalog);
  return {
    outcome: 'fallback',
    componentId: fallbackInstance.id,
    message: `${requestedComponentId} (${instance.type}) is incompatible with ${boardVoltage} — ${reason}. Using fallback: ${fallbackInstance.type}.`,
    fallbackInstance,
  };
}

function selectFallbackType(
  requestedType: ComponentTypeMetadata,
  catalog: ComponentCatalog,
  boardVoltage: '3.3V' | '5V'
): { fallbackType: string | null; reason: string } {
  const candidates = Object.entries(catalog).filter(
    ([, meta]) => meta.function === requestedType.function && meta.voltageTolerance.includes(boardVoltage)
  );

  if (candidates.length === 0) {
    return { fallbackType: null, reason: `No ${requestedType.function} component supports ${boardVoltage}` };
  }

  const [fallbackKey] = candidates[0];
  return {
    fallbackType: fallbackKey,
    reason: `Using ${fallbackKey} as fallback (${requestedType.function} with ${boardVoltage} support)`,
  };
}

function createFallbackInstance(
  requestedInstance: ComponentInstance,
  fallbackType: string,
  catalog: ComponentCatalog
): ComponentInstance {
  const typeMeta = catalog[fallbackType];
  const offsetX = 50;
  return {
    id: `${requestedInstance.id}_fallback`,
    type: fallbackType,
    x: requestedInstance.x + offsetX,
    y: requestedInstance.y,
    properties: { ...requestedInstance.properties, isFallback: true },
  };
}
