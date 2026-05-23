// Ed25519 public key used to verify Nabu remote catalog releases.
// The matching private key is held by the publisher (release pipeline);
// it MUST NOT be present in this repo.
//
// To rotate: generate a new pair with `node mcp/tools/keygen.js`,
// replace the constant below, update the secret in the publisher
// environment, and ship a new app build embedding the new pubkey.
//
// Current dev key — pre-production. Rotate before first real release.
export const NABU_PUBKEY_HEX =
  "24037eac974fc20694c1341ec078c80882c4aa26636d62edd49ede90a84ca794";
