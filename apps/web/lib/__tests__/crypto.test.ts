import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto';

describe('Crypto Utility (AES-256-GCM)', () => {
  it('should encrypt and decrypt a plaintext string correctly', () => {
    const secretText = 'super-secret-oauth-token-12345';
    const encrypted = encrypt(secretText);

    expect(encrypted).not.toBe(secretText);
    expect(encrypted).toContain(':'); // iv:authTag:encrypted

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretText);
  });

  it('should support empty and complex UTF-8 strings', () => {
    const text = '🚀 Special Chars: ✨ @#$%^&*()_+=~` 🎧';
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const text = 'same-token';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(text);
    expect(decrypt(encrypted2)).toBe(text);
  });

  it('should throw an error when attempting to decrypt invalid format', () => {
    expect(() => decrypt('invalid-format-without-colons')).toThrow('Invalid encrypted text format');
  });

  it('should throw an error when attempting to decrypt tampered authentication tag or ciphertext', () => {
    const encrypted = encrypt('original-data');
    const parts = encrypted.split(':');
    
    // Modify ciphertext (last part)
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
    expect(() => decrypt(tamperedCiphertext)).toThrow();
  });
});
