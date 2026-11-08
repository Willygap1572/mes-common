import {
  resolveValue,
  writeValue,
  type ActionContext,
} from './telegram-plugin.js';

describe('telegram plugin helpers', () => {
  const ctx = (): ActionContext => ({
    request: { pressure: 8 },
    response: {},
    variables: { total: 10 },
  });

  it('resolves scoped references and literals', () => {
    const c = ctx();
    expect(resolveValue(c, 'request.pressure')).toBe(8);
    expect(resolveValue(c, 'variables.total')).toBe(10);
    expect(resolveValue(c, 42)).toBe(42);
    expect(resolveValue(c, 'plain text')).toBe('plain text');
  });

  it('writes only to response and variables', () => {
    const c = ctx();
    writeValue(c, 'response.status', 'OK');
    expect(c.response).toEqual({ status: 'OK' });
    expect(() => writeValue(c, 'request.pressure', 1)).toThrow(
      'Invalid target',
    );
  });
});
