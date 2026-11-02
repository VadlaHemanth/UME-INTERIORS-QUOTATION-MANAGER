export interface OwnerAccount {
  username: string;
  salt: string;
  passwordHash: string;
  sessionSecret: string;
  version: number;
  environmentCredentials?: { username: string; salt: string; passwordHash: string };
}

const encoder = new TextEncoder();
export const SESSION_COOKIE = 'ume_owner';
export const SESSION_SECONDS = 8 * 60 * 60;

export function randomHex(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (value) => value.toString(16).padStart(2, '0')).join('');
}

function bytesFromHex(value: string): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(new ArrayBuffer(Math.floor(value.length / 2)));
  for (let index = 0; index < result.length; index++) result[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return result;
}

export function validUsername(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && /^[a-zA-Z0-9][a-zA-Z0-9 ._@+-]{2,63}$/.test(value);
}

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 256;
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytesFromHex(salt), iterations: 100_000 }, key, 256);
  return Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function createOwner(username: string, password: string, version = 1): Promise<OwnerAccount> {
  username = username.trim();
  if (!validUsername(username) || !validPassword(password)) throw new Error('Username must be 3–64 characters; password must be 12–256 characters.');
  const salt = randomHex(16);
  return { username, salt, passwordHash: await passwordHash(password, salt), sessionSecret: randomHex(), version };
}

export async function verifyPassword(owner: Pick<OwnerAccount, 'salt' | 'passwordHash'>, password: unknown): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 256) return false;
  const actual = bytesFromHex(await passwordHash(password, owner.salt));
  const expected = bytesFromHex(owner.passwordHash);
  let different = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) different |= actual[i] ^ (expected[i] || 0);
  return different === 0;
}

// Cache only the last slow PBKDF2 comparison in this process/isolate. The
// persisted environment baseline remains salted and stretched like the login hash.
let checkedEnvironment: { username: string; password: string; salt: string; passwordHash: string; result: Promise<boolean> } | undefined;

export function rememberEnvironmentCredentials(owner: OwnerAccount): OwnerAccount {
  return { ...owner, environmentCredentials: { username: owner.username, salt: owner.salt, passwordHash: owner.passwordHash } };
}

export async function reconcileEnvironmentCredentials(owner: OwnerAccount, username: string, password: string): Promise<OwnerAccount> {
  const baseline = owner.environmentCredentials || owner;
  let matches = false;
  if (username === baseline.username) {
    const cached = checkedEnvironment;
    if (cached && cached.username === username && cached.password === password && cached.salt === baseline.salt && cached.passwordHash === baseline.passwordHash) {
      matches = await cached.result;
    } else {
      const result = verifyPassword(baseline, password);
      checkedEnvironment = { username, password, salt: baseline.salt, passwordHash: baseline.passwordHash, result };
      matches = await result;
    }
  }
  if (matches) return owner.environmentCredentials ? owner : rememberEnvironmentCredentials(owner);
  return rememberEnvironmentCredentials(await createOwner(username, password, owner.version + 1));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', bytesFromHex(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function issueSession(owner: OwnerAccount, now = Date.now()): Promise<string> {
  const payload = `${owner.version}.${Math.floor(now / 1000) + SESSION_SECONDS}.${randomHex(16)}`;
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(owner.sessionSecret), encoder.encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export async function validSession(owner: OwnerAccount | undefined, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!owner || !token || token.length > 256) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1]) || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const expires = Number(parts[1]);
  if (Number(parts[0]) !== owner.version || expires <= Math.floor(now / 1000) || expires > Math.floor(now / 1000) + SESSION_SECONDS) return false;
  return crypto.subtle.verify('HMAC', await hmacKey(owner.sessionSecret), bytesFromHex(parts[3]), encoder.encode(parts.slice(0, 3).join('.')));
}

export function readSession(request: Request): string | undefined {
  return (request.headers.get('cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export function sessionCookie(token: string, secure: boolean, clear = false): string {
  return `${SESSION_COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}
