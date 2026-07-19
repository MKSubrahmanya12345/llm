// ??$$$ Phase 1 validations: thin schema/pin/duplicate/power/ground checks.
// This file is the source of truth. There is no longer a legacy shim
// layer; the old `validators.ts` was deleted in Phase 10.

import type { ComponentInstance, ConnectionSchema, VelxioProject } from './types';
import { CatalogService } from './catalog/CatalogService';

export type ValidationErrorType =
  | 'schema'
  | 'unknown_component'
  | 'unknown_pin'
  | 'duplicate_connection'
  | 'missing_power'
  | 'missing_ground';

export interface ValidationError {
  type: ValidationErrorType;
  instanceId?: string;
  pin?: string;
  fix: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export function validateSchema(project: VelxioProject): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!project || typeof project !== 'object') {
    errors.push({ type: 'schema', fix: 'Project must be a JSON object.' });
    return errors;
  }
  if (!project.projectMetadata?.name || typeof project.projectMetadata.name !== 'string') {
    errors.push({ type: 'schema', fix: 'projectMetadata.name is required and must be a string.' });
  }
  if (!Array.isArray(project.components)) {
    errors.push({ type: 'schema', fix: 'components must be an array.' });
  }
  if (!Array.isArray(project.connections)) {
    errors.push({ type: 'schema', fix: 'connections must be an array.' });
  }
  for (const comp of project.components ?? []) {
    if (!comp.id) {
      errors.push({ type: 'schema', fix: 'Every component requires a non-empty id.' });
    } else if (!comp.type) {
      errors.push({ type: 'schema', instanceId: comp.id, fix: `Component "${comp.id}" is missing type.` });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Pin existence
// ---------------------------------------------------------------------------

export function validatePins(project: VelxioProject): ValidationError[] {
  const errors: ValidationError[] = [];
  const catalog = CatalogService.get();
  const byId = new Map<string, ComponentInstance>();
  for (const c of project.components) byId.set(c.id, c);

  for (const conn of project.connections) {
    for (const endpoint of [conn.from, conn.to]) {
      const err = checkEndpoint(endpoint, byId, catalog);
      if (err) errors.push(err);
    }
  }
  return errors;
}

function checkEndpoint(
  endpoint: string,
  byId: Map<string, ComponentInstance>,
  catalog: CatalogService
): ValidationError | null {
  const { instanceId, pin } = splitEndpoint(endpoint);
  if (!instanceId || !pin) {
    return {
      type: 'schema',
      fix: `Connection endpoint "${endpoint}" must be of the form "instanceId:pinName".`,
    };
  }
  const instance = byId.get(instanceId);
  if (!instance) {
    return {
      type: 'unknown_component',
      instanceId,
      pin,
      fix: `Connection references unknown instance "${instanceId}".`,
    };
  }
  const meta = catalog.getComponent(instance.type);
  if (!meta) {
    return {
      type: 'unknown_component',
      instanceId,
      pin,
      fix: `Component type "${instance.type}" is not in the catalog.`,
    };
  }
  if (!pin || pin.trim().length === 0) {
    return {
      type: 'unknown_pin',
      instanceId,
      pin,
      fix: `Pin name is empty for endpoint "${endpoint}".`,
    };
  }
  return null;
}

function splitEndpoint(endpoint: string): { instanceId: string; pin: string } {
  const idx = endpoint.indexOf(':');
  if (idx < 0) return { instanceId: '', pin: '' };
  return { instanceId: endpoint.slice(0, idx), pin: endpoint.slice(idx + 1) };
}

// ---------------------------------------------------------------------------
// Duplicate connections
// ---------------------------------------------------------------------------

export function validateDuplicates(project: VelxioProject): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  for (const conn of project.connections) {
    const key = canonicalConnectionKey(conn);
    if (seen.has(key)) {
      errors.push({
        type: 'duplicate_connection',
        fix: `Duplicate connection: ${conn.from} <-> ${conn.to}.`,
      });
    } else {
      seen.add(key);
    }
  }
  return errors;
}

function canonicalConnectionKey(conn: ConnectionSchema): string {
  const a = `${conn.from}`;
  const b = `${conn.to}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ---------------------------------------------------------------------------
// Power / ground
// ---------------------------------------------------------------------------

const POWER_LIKE = ['5V', '3V3', '3.3V', 'VCC', 'VIN', 'VBUS', 'VSYS'];
const GROUND_LIKE = ['GND'];

function pinMatches(endpoint: string, candidates: string[]): boolean {
  const { pin } = splitEndpoint(endpoint);
  if (!pin) return false;
  const upper = pin.toUpperCase();
  return candidates.some((c) => c.toUpperCase() === upper || upper.startsWith(`${c.toUpperCase()}.`));
}

export function validatePower(project: VelxioProject): ValidationError[] {
  const errors: ValidationError[] = [];
  const hasPower = project.connections.some((c) => pinMatches(c.from, POWER_LIKE) || pinMatches(c.to, POWER_LIKE));
  if (!hasPower) {
    errors.push({
      type: 'missing_power',
      fix: 'No power (5V / 3V3 / VCC / VIN) connection found. Power the components.',
    });
  }
  return errors;
}

export function validateGround(project: VelxioProject): ValidationError[] {
  const errors: ValidationError[] = [];
  const hasGround = project.connections.some((c) => pinMatches(c.from, GROUND_LIKE) || pinMatches(c.to, GROUND_LIKE));
  if (!hasGround) {
    errors.push({
      type: 'missing_ground',
      fix: 'No GND connection found. Add a common ground.',
    });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Combined entry point
// ---------------------------------------------------------------------------

export function validateProject(project: VelxioProject): ValidationResult {
  const errors: ValidationError[] = [
    ...validateSchema(project),
    ...validatePins(project),
    ...validateDuplicates(project),
    ...validatePower(project),
    ...validateGround(project),
  ];
  return { valid: errors.length === 0, errors };
}
