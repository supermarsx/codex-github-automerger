import { describe, it, expect } from 'vitest';
import { hexToHSL } from '@/lib/utils';
import { matchesPattern } from '../../shared/matchesPattern';

describe('hexToHSL', () => {
  it('converts 6-digit hex codes to HSL', () => {
    expect(hexToHSL('#ff0000')).toBe('0 100% 50%');
    expect(hexToHSL('#00ff00')).toBe('120 100% 50%');
    expect(hexToHSL('#0000ff')).toBe('240 100% 50%');
  });

  it('converts 3-digit hex codes to HSL', () => {
    expect(hexToHSL('#f00')).toBe('0 100% 50%');
    expect(hexToHSL('#0f0')).toBe('120 100% 50%');
    expect(hexToHSL('#00f')).toBe('240 100% 50%');
  });
});

describe('matchesPattern', () => {
  it('handles "*" wildcard', () => {
    expect(matchesPattern('foobarbaz', 'foo*')).toBe(true);
    expect(matchesPattern('foobazbar', 'foo*bar')).toBe(true);
    expect(matchesPattern('foobarbaz', 'foo*bar')).toBe(false);
    expect(matchesPattern('anything', '*')).toBe(true);
  });

  it('treats "?" as a literal character', () => {
    expect(matchesPattern('foo?bar', 'foo?bar')).toBe(true);
    expect(matchesPattern('fooXbar', 'foo?bar')).toBe(false);
  });
});

