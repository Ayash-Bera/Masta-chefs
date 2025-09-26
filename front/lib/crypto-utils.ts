'use client'

import { bytesToHex, hexToBytes, keccak256, type Hex } from 'viem';
import { Base8, subOrder, mulPointEscalar } from "@zk-kit/baby-jubjub";

export { subOrder };

export function formatPrivKeyForBabyJub(privateKey: bigint): bigint {
  return privateKey % subOrder;
}

export function i0(signature: string): bigint {
  if (typeof signature !== "string" || signature.length < 132)
    throw new Error("Invalid signature hex string");

  const normalizedSignature = signature.startsWith("0x")
    ? (signature as Hex)
    : (`0x${signature}` as Hex);

  const hash = keccak256(normalizedSignature);
  const bytes = hexToBytes(hash);

  bytes[0] &= 0b11111000;
  bytes[31] &= 0b01111111;
  bytes[31] |= 0b01000000;

  const le = new Uint8Array([...bytes].reverse());
  let sk = BigInt(bytesToHex(le));

  sk %= subOrder;
  if (sk === BigInt(0)) sk = BigInt(1);
  return sk;
}


