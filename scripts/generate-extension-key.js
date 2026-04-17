/**
 * Generates an RSA-2048 keypair for the Chrome extension and prints:
 *   - The base64 "key" value to paste into extension/manifest.json
 *   - The resulting stable extension ID
 *
 * Run once:
 *   node scripts/generate-extension-key.js
 *
 * Then:
 *   1. Paste the printed key into extension/manifest.json under "key"
 *   2. Set CHROME_EXTENSION_ID in widget/src/main/native-messaging.ts to the printed ID
 *   3. Rebuild the desktop app and reload the extension in Chrome
 *
 * The key can be committed to git — it is the extension's "identity", not a secret.
 * The private key is only used to derive the ID; Chrome does not use it for signing
 * unpacked extensions (signing is done by the Chrome Web Store for published extensions).
 */

const { generateKeyPairSync, createHash } = require('crypto');

// Generate RSA-2048 keypair
const { publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// The "key" field in manifest.json is the base64-encoded DER public key
const keyBase64 = publicKey.toString('base64');

// Chrome derives the extension ID by:
//   1. SHA-256 hashing the DER-encoded public key
//   2. Taking the first 16 bytes
//   3. Encoding each nibble as a letter a-p (a=0, b=1, ..., p=15)
const hash = createHash('sha256').update(publicKey).digest();
const id   = Array.from(hash.slice(0, 16))
  .flatMap((byte) => [byte >> 4, byte & 0xf])
  .map((n) => String.fromCharCode(97 + n))
  .join('');

console.log('\n=== Protocol Chrome Extension Key ===\n');
console.log('Paste this into extension/manifest.json under "key":');
console.log('\n' + keyBase64 + '\n');
console.log('Your stable Chrome extension ID:');
console.log('\n' + id + '\n');
console.log('Set CHROME_EXTENSION_ID in widget/src/main/native-messaging.ts to:');
console.log('\n  ' + id + '\n');
console.log('Then rebuild the desktop app and reload the extension in Chrome.');
console.log('The key can be committed to git.\n');
