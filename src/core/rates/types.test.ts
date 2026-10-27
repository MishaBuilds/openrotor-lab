import { describe, expect, it } from 'vitest';
import { describeError } from './errors';
import { AXES, isAxis } from './types';

describe('axis helpers', () => {
  it('lists the three control axes in a stable order', () => {
    expect([...AXES]).toEqual(['roll', 'pitch', 'yaw']);
  });

  it('recognises axis names', () => {
    expect(isAxis('roll')).toBe(true);
    expect(isAxis('pitch')).toBe(true);
    expect(isAxis('yaw')).toBe(true);
    expect(isAxis('throttle')).toBe(false);
    expect(isAxis(0)).toBe(false);
  });
});

describe('describeError', () => {
  it('uses the message of real errors', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('falls back to a string representation of anything else', () => {
    expect(describeError('boom')).toBe('boom');
    expect(describeError(42)).toBe('42');
    expect(describeError(undefined)).toBe('undefined');
  });
});
