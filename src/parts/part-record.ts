/**
 * A finished part as `parttracking` hands it over to `parthistory`
 * (`POST /api/v1/ingest/parts`). Sending the same serial again replaces the
 * stored record, so redeliveries are harmless. The additional data block is
 * not part of it: it only matters while the part is on the line.
 */
export interface PartRecord {
  serial: string;
  catalogId: string;
  catalogVersion: number | null;
  /** Final status on the line. */
  status: PartRecordStatus;
  /** Last station (factorystructure node). */
  nodeId: string | null;
  carrier: string | null;
  metadata: Record<string, unknown>;
  /** ISO 8601 timestamps. */
  createdAt: string;
  finishedAt: string | null;
  results: PartRecordResult[];
  materials: PartRecordMaterial[];
  /** Parts this one is made of (assembly) or comes from (split). */
  inputs: PartRecordLink[];
}

export const PART_RECORD_STATUSES = [
  'in_process',
  'nok',
  'ok',
  'scrap',
  'consumed',
] as const;
export type PartRecordStatus = (typeof PART_RECORD_STATUSES)[number];

export interface PartRecordResult {
  nodeId: string;
  ok: boolean;
  values: Record<string, unknown>;
  failures: string[];
  recordedAt: string;
}

export interface PartRecordMaterial {
  materialCode: string;
  lot: string | null;
  quantity: number;
  nodeId: string | null;
  linkedAt: string;
}

export interface PartRecordLink {
  /** Serial of the input part. */
  serial: string;
  kind: 'assembly' | 'split';
  nodeId: string | null;
  linkedAt: string;
}
