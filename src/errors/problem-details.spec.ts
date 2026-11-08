import { problem } from './problem-details.js';

describe('problem', () => {
  it('builds an RFC 9457 body with a namespaced type', () => {
    expect(problem('linecontrol', 'part-not-ok', 409, 'Part is NOK')).toEqual({
      type: 'urn:mes:linecontrol:part-not-ok',
      title: 'Part is NOK',
      status: 409,
      detail: undefined,
      module: 'linecontrol',
    });
  });
});
