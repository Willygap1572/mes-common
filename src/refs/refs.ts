/**
 * References between modules. A module never copies data owned by another
 * module: it stores one of these references and asks the owner via REST.
 */

/** Node of the plant hierarchy, owned by `factorystructure`. */
export interface PlantNodeRef {
  nodeId: string;
}

/** ISA-95 / IEC 62264 hierarchy levels. */
export const PLANT_LEVELS = [
  'enterprise',
  'site',
  'area',
  'line',
  'workcell',
  'machine',
] as const;
export type PlantLevel = (typeof PLANT_LEVELS)[number];

/** A catalog (product variant) in a concrete version, owned by `catalog`. */
export interface CatalogRef {
  catalogId: string;
  version: number;
}

/** Material master entry, owned by `materialcontrol`. */
export interface MaterialRef {
  materialId: string;
}

/** A physical part identified by its serial number. */
export interface PartRef {
  serialNumber: string;
}

/** Result of a part at a process step. */
export type PartStatus = 'OK' | 'NOK' | 'REWORK' | 'SCRAP' | 'IN_PROCESS';

/** Information every module returns at `GET /api/v1/info`. */
export interface ModuleInfo {
  name: string;
  title: string;
  version: string;
}

export function catalogKey(ref: CatalogRef): string {
  return `${ref.catalogId}@${ref.version}`;
}
