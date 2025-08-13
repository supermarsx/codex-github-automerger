import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'enc:';

function getKey(): Buffer | null {
  const secret = process.env.WEBHOOK_SECRET_KEY;
  if (!secret) return null;
  // Derive a 32-byte key from the provided string
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(secret: string): string {
  const key = getKey();
  if (!key) return secret;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(secret: string): string {
  const key = getKey();
  if (!key) return secret;
  if (!secret.startsWith(PREFIX)) return secret;
  const [ivHex, dataHex] = secret.slice(PREFIX.length).split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
