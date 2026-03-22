import { describe, expect, it } from 'vitest';
import { isPdfPasswordError } from './pdf-errors.ts';

describe('isPdfPasswordError', () => {
  it('detects PDF.js password exceptions by name', () => {
    expect(isPdfPasswordError({ name: 'PasswordException', message: 'Something else' })).toBe(true);
  });

  it('detects common password messages', () => {
    expect(isPdfPasswordError(new Error('Incorrect password. Please try again.'))).toBe(true);
    expect(isPdfPasswordError(new Error('This PDF is encrypted and needs a password'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isPdfPasswordError(new Error('Failed to fetch'))).toBe(false);
  });
});
