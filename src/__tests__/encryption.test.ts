import { describe, it, expect, vi } from 'vitest';
import { EncryptionService } from '@/utils/encryption';
import wordlist from '@/utils/bip39-english.json';

describe('EncryptionService.generateRecoveryPhrase', () => {
  it('returns 12 words from BIP39 list using secure randomness', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    const phrase = EncryptionService.generateRecoveryPhrase();

    expect(spy).toHaveBeenCalled();
    expect(phrase).toHaveLength(12);
    phrase.forEach(word => {
      expect((wordlist as string[])).toContain(word);
    });

    spy.mockRestore();
  });
});
