// Tiny Ed25519 wrapper around @noble/ed25519.
// `latest.json` is signed verbatim (utf8 bytes). Signature is hex-encoded.
//
// Layout of a release bundle:
//   latest.json          <- catalog index (services map, sha256 per asset, ...)
//   latest.json.sig      <- hex-encoded ed25519 signature of latest.json bytes
//   handlers/<name>.js   <- self-contained handler modules
//   schemas/<name>.js    <- Zod schemas

import * as ed25519 from "@noble/ed25519";

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (typeof hex !== "string" || hex.length % 2 !== 0) {
    throw new Error("invalid hex");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function generateKeypair() {
  const priv = ed25519.utils.randomPrivateKey();
  const pub = await ed25519.getPublicKeyAsync(priv);
  return { privateKeyHex: bytesToHex(priv), publicKeyHex: bytesToHex(pub) };
}

export async function sign(message, privateKeyHex) {
  const bytes =
    typeof message === "string" ? new TextEncoder().encode(message) : message;
  const sig = await ed25519.signAsync(bytes, hexToBytes(privateKeyHex));
  return bytesToHex(sig);
}

export async function verify(message, signatureHex, publicKeyHex) {
  const bytes =
    typeof message === "string" ? new TextEncoder().encode(message) : message;
  return ed25519.verifyAsync(
    hexToBytes(signatureHex),
    bytes,
    hexToBytes(publicKeyHex),
  );
}

export { bytesToHex, hexToBytes };
