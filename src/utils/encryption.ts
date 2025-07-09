import CryptoJS from 'crypto-js';

export interface EncryptionResult {
  encrypted: string;
  salt: string;
  iv: string;
  iterations: number;
}

export interface DecryptionResult {
  decrypted: string;
  success: boolean;
}

export class EncryptionService {
  private static readonly DEFAULT_ITERATIONS = 100000;

  // Benchmark the key derivation
  static async benchmarkKeyDerivation(durationMs: number = 1000): Promise<{ iterations: number; time: number }> {
    const startTime = performance.now();
    const testData = 'benchmark test data';
    const testPassword = 'test password';
    let iterations = 0;
    
    while (performance.now() - startTime < durationMs) {
      await this.encrypt(testData, testPassword, 10000);
      iterations += 10000;
    }
    
    const endTime = performance.now();
    return {
      iterations,
      time: endTime - startTime
    };
  }

  static async encrypt(
    data: string, 
    password: string, 
    iterations: number = this.DEFAULT_ITERATIONS
  ): Promise<EncryptionResult> {
    const salt = CryptoJS.lib.WordArray.random(256/8);
    const iv = CryptoJS.lib.WordArray.random(128/8);
    
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: iterations
    });
    
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    
    return {
      encrypted: encrypted.toString(),
      salt: salt.toString(),
      iv: iv.toString(),
      iterations
    };
  }

  static async decrypt(
    encryptionResult: EncryptionResult,
    password: string
  ): Promise<DecryptionResult> {
    try {
      const salt = CryptoJS.enc.Hex.parse(encryptionResult.salt);
      const iv = CryptoJS.enc.Hex.parse(encryptionResult.iv);
      
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: encryptionResult.iterations
      });
      
      const decrypted = CryptoJS.AES.decrypt(encryptionResult.encrypted, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        return { decrypted: '', success: false };
      }
      
      return { decrypted: decryptedString, success: true };
    } catch (error) {
      return { decrypted: '', success: false };
    }
  }

  static generateRecoveryPhrase(): string[] {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'age',
      'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm',
      'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost',
      'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing',
      'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
      'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna'
    ];
    
    const phrase = [];
    for (let i = 0; i < 12; i++) {
      phrase.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return phrase;
  }

  static phraseToPassword(phrase: string[]): string {
    return CryptoJS.SHA256(phrase.join(' ')).toString();
  }
}