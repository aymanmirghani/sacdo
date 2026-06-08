const CREDENTIAL_KEY = 'sacdo_biometric_credential';
const ENABLED_KEY = 'sacdo_biometric_enabled';

function encode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function decode(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isBiometricSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export function isBiometricEnabled(): boolean {
  return (
    localStorage.getItem(ENABLED_KEY) === 'true' &&
    !!localStorage.getItem(CREDENTIAL_KEY)
  );
}

export async function registerBiometric(userId: string, displayName: string): Promise<boolean> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'SACDO', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: displayName,
          displayName,
        },
        pubKeyCredParams: [
          { alg: -7,   type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;
    localStorage.setItem(CREDENTIAL_KEY, encode(credential.rawId));
    localStorage.setItem(ENABLED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  const credentialId = localStorage.getItem(CREDENTIAL_KEY);
  if (!credentialId) return false;
  try {
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [{ id: decode(credentialId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!result;
  } catch {
    return false;
  }
}

export function disableBiometric(): void {
  localStorage.removeItem(CREDENTIAL_KEY);
  localStorage.removeItem(ENABLED_KEY);
}
