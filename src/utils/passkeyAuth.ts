export interface PasskeyCredential {
  id: string;
  publicKey: string;
  counter: number;
  created: Date;
  label: string;
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
  private static isAuthenticating = false;
  private static isAuthenticated = false;
  private static lastCredentialId: string | null = null;

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
      const storedCredentials = await this.getStoredCredentials();
      if (storedCredentials.length > 0) {
        return { success: false, error: 'A passkey is already registered' };
      }

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
        label: username,
      };

      // Store credential in IndexedDB (in production, use secure server storage)
      storedCredentials.push(passkeyCredential);
      await setItem('passkey_credentials', storedCredentials);

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

    if (this.isAuthenticated) {
      return { success: true, credentialId: this.lastCredentialId || undefined };
    }

    if (this.isAuthenticating) {
      return { success: false, error: 'Authentication in progress' };
    }

    try {
      this.isAuthenticating = true;
      const storedCredentials = await this.getStoredCredentials();
      
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
      await setItem('passkey_credentials', updatedCredentials);

      this.isAuthenticated = true;
      this.lastCredentialId = credential.id;
      return { success: true, credentialId: credential.id };
    } catch (error) {
      console.error('Passkey authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    } finally {
      this.isAuthenticating = false;
    }
  }

  static async getStoredCredentials(): Promise<PasskeyCredential[]> {
    try {
      const stored = await getItem<any>('passkey_credentials');
      if (!stored) return [];
      const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
      return parsed.map((cred: any) => ({
        ...cred,
        created: new Date(cred.created),
        lastUsed: cred.lastUsed ? new Date(cred.lastUsed) : undefined,
      }));
    } catch {
      return [];
    }
  }

  static async removeCredential(credentialId: string): Promise<void> {
    const credentials = await this.getStoredCredentials();
    const filtered = credentials.filter(cred => cred.id !== credentialId);
    await setItem('passkey_credentials', filtered);
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
    // WebAuthn credential IDs are base64url encoded. Convert to
    // standard Base64 before decoding to an ArrayBuffer.
    const b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }}