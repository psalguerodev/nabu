// Ed25519 public key used to verify Nabu remote catalog releases.
// The matching private key is held by the publisher (release pipeline);
// it MUST NOT be present in this repo.
//
// To rotate: generate a new pair with `node mcp/tools/keygen.js`,
// replace the constant below, update the secret in the publisher
// environment, and ship a new app build embedding the new pubkey.
//
// Active Nabu release-signing public key.
// Last rotation: 2026-05-23 (initial public push).
export const NABU_PUBKEY_HEX =
  "53ed4c30989ca4c8d530dd898fdb5e4bd63b68a057f588713013709e3db9b0a2";
