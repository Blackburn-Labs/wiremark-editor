// @ts-check
import { describe, it, expect } from 'vitest';
import { applyStructuralEdit } from './thunks.js';
import { applyEdit } from './documentSlice.js';
import { selectElement } from './uiSlice.js';

describe('applyStructuralEdit', () => {
  it('dispatches applyEdit then selectElement in order', () => {
    const dispatched = [];
    const dispatch = (action) => dispatched.push(action);
    applyStructuralEdit({ source: 'Wireframe #x mobile\n', selectId: '0.1' })(dispatch);
    expect(dispatched).toEqual([
      applyEdit('Wireframe #x mobile\n'),
      selectElement('0.1'),
    ]);
  });

  it('defaults selectId to null (clears selection)', () => {
    const dispatched = [];
    const dispatch = (action) => dispatched.push(action);
    applyStructuralEdit({ source: 'x' })(dispatch);
    expect(dispatched[0]).toEqual(applyEdit('x'));
    expect(dispatched[1]).toEqual(selectElement(null));
  });
});
