/**
 * Binary telegram codec.
 *
 * PLCs send fixed-layout binary telegrams (e.g. S7 data blocks over TCP).
 * A layout describes where every field is; `decodeTelegram` turns the bytes
 * into named values and `encodeTelegram` does the opposite. Pure functions on
 * `Uint8Array`, so they work in Node.js and in the browser.
 *
 * Convention: every telegram starts with its type id, an unsigned 16-bit
 * big-endian integer at offset 0 (`readTypeId`).
 */

export const FIELD_TYPES = [
  'uint8',
  'int8',
  'uint16',
  'int16',
  'uint32',
  'int32',
  'float32',
  'float64',
  'bool',
  'string',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldValue = number | string | boolean;

export interface TelegramField {
  name: string;
  type: FieldType;
  /** Byte offset from the start of the telegram. */
  offset: number;
  /** Bytes, only for `string` (ASCII, padded with NUL). */
  length?: number;
  /** Bit 0-7 inside the byte, only for `bool`. */
  bit?: number;
  /** Constant written on encode (e.g. the response type id). */
  value?: FieldValue;
  description?: string;
}

export interface TelegramLayout {
  byteOrder: 'big' | 'little';
  /** Total size in bytes. */
  size: number;
  fields: TelegramField[];
}

/** A complete telegram definition, as stored by telegramconfigurator. */
export interface TelegramDefinition {
  id: string;
  code: string;
  name: string;
  /** Value of the uint16 at offset 0 that identifies the telegram. */
  typeId: number;
  /** Machine (plant node) it applies to; `null` for every machine. */
  nodeId: string | null;
  request: TelegramLayout;
  response: TelegramLayout;
  steps: { action: string; params?: Record<string, unknown> }[];
}

const SIZES: Record<Exclude<FieldType, 'string'>, number> = {
  uint8: 1,
  int8: 1,
  uint16: 2,
  int16: 2,
  uint32: 4,
  int32: 4,
  float32: 4,
  float64: 8,
  bool: 1,
};

export const TYPE_ID_OFFSET = 0;

export function fieldSize(field: TelegramField): number {
  return field.type === 'string' ? (field.length ?? 0) : SIZES[field.type];
}

/** Returns the problems of a layout; an empty list means it is valid. */
export function validateLayout(layout: TelegramLayout): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(layout.size) ||
    layout.size < 2 ||
    layout.size > 65535
  ) {
    errors.push('size must be an integer between 2 and 65535');
  }
  if (layout.byteOrder !== 'big' && layout.byteOrder !== 'little') {
    errors.push('byteOrder must be "big" or "little"');
  }
  const names = new Set<string>();
  /** Byte -> owner; bools share a byte when their bits differ. */
  const used = new Map<number, { name: string; bits?: Set<number> }>();

  for (const f of layout.fields ?? []) {
    const label = `field "${f.name}"`;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name ?? ''))
      errors.push(`${label}: invalid name`);
    if (names.has(f.name)) errors.push(`${label}: duplicated name`);
    names.add(f.name);
    if (!(FIELD_TYPES as readonly string[]).includes(f.type)) {
      errors.push(`${label}: unknown type "${f.type}"`);
      continue;
    }
    if (
      f.type === 'string' &&
      !(Number.isInteger(f.length) && (f.length ?? 0) > 0)
    ) {
      errors.push(`${label}: strings need a positive length`);
      continue;
    }
    if (
      f.type === 'bool' &&
      !(Number.isInteger(f.bit) && (f.bit ?? -1) >= 0 && (f.bit ?? 8) <= 7)
    ) {
      errors.push(`${label}: bool fields need a bit between 0 and 7`);
      continue;
    }
    const size = fieldSize(f);
    if (
      !Number.isInteger(f.offset) ||
      f.offset < 0 ||
      f.offset + size > layout.size
    ) {
      errors.push(
        `${label}: does not fit in the telegram (offset ${f.offset}, ${size} bytes)`,
      );
      continue;
    }
    for (let b = f.offset; b < f.offset + size; b++) {
      const owner = used.get(b);
      if (!owner) {
        used.set(
          b,
          f.type === 'bool'
            ? { name: f.name, bits: new Set([f.bit!]) }
            : { name: f.name },
        );
      } else if (f.type === 'bool' && owner.bits && !owner.bits.has(f.bit!)) {
        owner.bits.add(f.bit!);
      } else {
        errors.push(`${label}: overlaps field "${owner.name}" at byte ${b}`);
        break;
      }
    }
  }
  return errors;
}

/** Type id of a telegram: uint16 big-endian at offset 0. */
export function readTypeId(bytes: Uint8Array): number {
  if (bytes.length < 2) throw new Error('Telegram too short: no type id');
  return (bytes[TYPE_ID_OFFSET] << 8) | bytes[TYPE_ID_OFFSET + 1];
}

export function decodeTelegram(
  bytes: Uint8Array,
  layout: TelegramLayout,
): Record<string, FieldValue> {
  if (bytes.length < layout.size) {
    throw new Error(
      `Telegram too short: ${bytes.length} bytes, expected ${layout.size}`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const le = layout.byteOrder === 'little';
  const out: Record<string, FieldValue> = {};
  for (const f of layout.fields) {
    const o = f.offset;
    switch (f.type) {
      case 'uint8':
        out[f.name] = view.getUint8(o);
        break;
      case 'int8':
        out[f.name] = view.getInt8(o);
        break;
      case 'uint16':
        out[f.name] = view.getUint16(o, le);
        break;
      case 'int16':
        out[f.name] = view.getInt16(o, le);
        break;
      case 'uint32':
        out[f.name] = view.getUint32(o, le);
        break;
      case 'int32':
        out[f.name] = view.getInt32(o, le);
        break;
      case 'float32':
        // float32 has ~7 significant digits: 2.4 instead of 2.4000000953674316
        out[f.name] = Number(view.getFloat32(o, le).toPrecision(7));
        break;
      case 'float64':
        out[f.name] = view.getFloat64(o, le);
        break;
      case 'bool':
        out[f.name] = ((view.getUint8(o) >> (f.bit ?? 0)) & 1) === 1;
        break;
      case 'string': {
        let text = '';
        for (let i = 0; i < (f.length ?? 0); i++) {
          const c = view.getUint8(o + i);
          if (c === 0) break;
          text += String.fromCharCode(c);
        }
        out[f.name] = text.trimEnd();
        break;
      }
    }
  }
  return out;
}

function toNumber(name: string, value: unknown): number {
  const n = typeof value === 'boolean' ? Number(value) : Number(value);
  if (!Number.isFinite(n))
    throw new Error(`Field "${name}" is not a number: ${String(value)}`);
  return n;
}

/**
 * Builds the bytes of a telegram. Constant fields (`value`) always win;
 * missing fields are written as 0 / empty.
 */
export function encodeTelegram(
  values: Readonly<Record<string, unknown>>,
  layout: TelegramLayout,
): Uint8Array {
  const bytes = new Uint8Array(layout.size);
  const view = new DataView(bytes.buffer);
  const le = layout.byteOrder === 'little';
  for (const f of layout.fields) {
    const raw = f.value !== undefined ? f.value : values[f.name];
    if (raw === undefined || raw === null) continue;
    const o = f.offset;
    switch (f.type) {
      case 'uint8':
        view.setUint8(o, toNumber(f.name, raw));
        break;
      case 'int8':
        view.setInt8(o, toNumber(f.name, raw));
        break;
      case 'uint16':
        view.setUint16(o, toNumber(f.name, raw), le);
        break;
      case 'int16':
        view.setInt16(o, toNumber(f.name, raw), le);
        break;
      case 'uint32':
        view.setUint32(o, toNumber(f.name, raw), le);
        break;
      case 'int32':
        view.setInt32(o, toNumber(f.name, raw), le);
        break;
      case 'float32':
        view.setFloat32(o, toNumber(f.name, raw), le);
        break;
      case 'float64':
        view.setFloat64(o, toNumber(f.name, raw), le);
        break;
      case 'bool':
        if (raw === true || raw === 1 || raw === '1' || raw === 'true') {
          view.setUint8(o, view.getUint8(o) | (1 << (f.bit ?? 0)));
        }
        break;
      case 'string': {
        const text =
          typeof raw === 'object'
            ? JSON.stringify(raw)
            : String(raw as string | number | boolean);
        for (let i = 0; i < Math.min(text.length, f.length ?? 0); i++) {
          const c = text.charCodeAt(i);
          view.setUint8(o + i, c < 128 ? c : 63 /* '?' */);
        }
        break;
      }
    }
  }
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/[\s:]/g, '');
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean))
    throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
