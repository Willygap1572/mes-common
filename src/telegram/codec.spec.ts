import {
  decodeTelegram,
  encodeTelegram,
  fromHex,
  readTypeId,
  type TelegramLayout,
  toHex,
  validateLayout,
} from './codec.js';

const layout: TelegramLayout = {
  byteOrder: 'big',
  size: 34,
  fields: [
    { name: 'typeId', type: 'uint16', offset: 0, value: 100 },
    { name: 'seq', type: 'uint16', offset: 2 },
    { name: 'serial', type: 'string', offset: 4, length: 20 },
    { name: 'pressure', type: 'float32', offset: 24 },
    { name: 'temperature', type: 'int16', offset: 28 },
    { name: 'ok', type: 'bool', offset: 30, bit: 0 },
    { name: 'rework', type: 'bool', offset: 30, bit: 3 },
    { name: 'station', type: 'uint8', offset: 31 },
    { name: 'delta', type: 'int16', offset: 32 },
  ],
};

describe('telegram codec', () => {
  it('round-trips every field type', () => {
    const bytes = encodeTelegram(
      {
        seq: 7,
        serial: 'BAT46-000123',
        pressure: 9.5,
        temperature: -12,
        ok: true,
        rework: true,
        station: 20,
        delta: -300,
      },
      layout,
    );
    expect(bytes.length).toBe(34);
    expect(readTypeId(bytes)).toBe(100);
    expect(decodeTelegram(bytes, layout)).toEqual({
      typeId: 100,
      seq: 7,
      serial: 'BAT46-000123',
      pressure: 9.5,
      temperature: -12,
      ok: true,
      rework: true,
      station: 20,
      delta: -300,
    });
  });

  it('respects the byte order', () => {
    const small: TelegramLayout = {
      byteOrder: 'little',
      size: 4,
      fields: [{ name: 'n', type: 'uint32', offset: 0 }],
    };
    expect(toHex(encodeTelegram({ n: 1 }, small))).toBe('01000000');
    expect(
      toHex(encodeTelegram({ n: 1 }, { ...small, byteOrder: 'big' })),
    ).toBe('00000001');
  });

  it('constant values win over the given ones', () => {
    const bytes = encodeTelegram({ typeId: 999 }, layout);
    expect(readTypeId(bytes)).toBe(100);
  });

  it('converts hex both ways', () => {
    expect(toHex(fromHex('00 64:0a ff'))).toBe('00640aff');
    expect(() => fromHex('abc')).toThrow('Invalid hex');
  });

  it('rejects short telegrams', () => {
    expect(() => decodeTelegram(new Uint8Array(10), layout)).toThrow(
      'too short',
    );
  });

  it('validates layouts', () => {
    expect(validateLayout(layout)).toEqual([]);
    const bad: TelegramLayout = {
      byteOrder: 'big',
      size: 4,
      fields: [
        { name: 'a', type: 'uint16', offset: 0 },
        { name: 'b', type: 'uint16', offset: 1 },
        { name: 'a', type: 'uint8', offset: 3 },
        { name: 'c', type: 'string', offset: 2 },
        { name: 'd', type: 'float32', offset: 2 },
        { name: 'e', type: 'bool', offset: 3, bit: 9 },
      ],
    };
    const errors = validateLayout(bad);
    expect(errors).toContain('field "b": overlaps field "a" at byte 1');
    expect(errors).toContain('field "a": duplicated name');
    expect(errors).toContain('field "c": strings need a positive length');
    expect(errors).toContain(
      'field "d": does not fit in the telegram (offset 2, 4 bytes)',
    );
    expect(errors).toContain(
      'field "e": bool fields need a bit between 0 and 7',
    );
  });
});
