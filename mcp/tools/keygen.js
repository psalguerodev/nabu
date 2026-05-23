#!/usr/bin/env node
// Generate a fresh Ed25519 keypair for signing Nabu remote catalogs.
//
// Usage:
//   node mcp/tools/keygen.js
//
// Prints the public key hex (commit this as NABU_PUBKEY_HEX in
// mcp/sign/pubkey.js) and the private key hex (KEEP THIS SECRET —
// store it in 1Password / a GitHub Actions secret named
// NABU_RELEASE_PRIVATE_KEY; do NOT commit it).
import { generateKeypair } from "../sign/index.js";

const { privateKeyHex, publicKeyHex } = await generateKeypair();

console.log("# Nabu Ed25519 keypair");
console.log("# ---");
console.log("# PUBLIC  (commit into mcp/sign/pubkey.js):");
console.log(`#   ${publicKeyHex}`);
console.log("#");
console.log("# PRIVATE (DO NOT COMMIT, store as a secret):");
console.log(`#   ${privateKeyHex}`);
