export interface PasskeyCredential {
  id: string;
  publicKey: string;
  counter: number;
  created: Date;
  lastUsed?: Date;
}

export interface PasskeyRegistrationResult {
  success: boolean;
  credential?: PasskeyCredential;
  error?: string;
}

export interface PasskeyAuthenticationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export class PasskeyService {
  private static readonly RP_NAME = 'AutoMerger Dashboard';
  private static readonly RP_ID = window.location.hostname;

  static isSupported(): boolean {
    return !!(
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get &&
      window.PublicKeyCredential
    );
  }

  static async register(username: string): Promise<PasskeyRegistrationResult> {
    if (!this.isSupported()) {
      return { success: false, error: 'Passkeys not supported in this browser' };
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(32);
      crypto.getRandomValues(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: this.RP_NAME,
          id: this.RP_ID,
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create credential' };
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      const passkeyCredential: PasskeyCredential = {
        id: credential.id,
        publicKey: this.arrayBufferToBase64(response.getPublicKey()!),
        counter: 0,
        created: new Date(),
      };

      // Store credential in localStorage (in production, use secure server storage)
      const storedCredentials = this.getStoredCredentials();
      storedCredentials.push(passkeyCredential);
      localStorage.setItem('passkey_credentials', JSON.stringify(storedCredentials));

      return { success: true, credential: passkeyCredential };
    } catch (error) {
      console.error('Passkey registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  static async authenticate(): Promise<PasskeyAuthenticationResult> {
    if (!this.isSupported()) {
      return { success: false, error: 'Passkeys not supported in this browser' };
    }

    try {
      const storedCredentials = this.getStoredCredentials();
      
      if (storedCredentials.length === 0) {
        return { success: false, error: 'No passkeys registered' };
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: storedCredentials.map(cred => ({
          id: this.base64ToArrayBuffer(cred.id),
          type: 'public-key',
          transports: ['internal'],
        })),
        userVerification: 'required',
        timeout: 60000,
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Authentication failed' };
      }

      // Update last used timestamp
      const updatedCredentials = storedCredentials.map(cred => 
        cred.id === credential.id 
          ? { ...cred, lastUsed: new Date() }
          : cred
      );
      localStorage.setItem('passkey_credentials', JSON.stringify(updatedCredentials));

      return { success: true, credentialId: credential.id };
    } catch (error) {
      console.error('Passkey authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  static getStoredCredentials(): PasskeyCredential[] {
    try {
      const stored = localStorage.getItem('passkey_credentials');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static removeCredential(credentialId: string): void {
    const credentials = this.getStoredCredentials();
    const filtered = credentials.filter(cred => cred.id !== credentialId);
    localStorage.setItem('passkey_credentials', JSON.stringify(filtered));
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}