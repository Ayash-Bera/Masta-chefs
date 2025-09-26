'use client'

import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { keccak256 } from 'viem';
import { Base8, subOrder, mulPointEscalar } from "@zk-kit/baby-jubjub";

export { subOrder };

export function formatPrivKeyForBabyJub(privateKey: bigint): bigint {
  return privateKey % subOrder;
}

export function i0(signature: string): bigint {
  if (typeof signature !== "string" || signature.length < 132)
    throw new Error("Invalid signature hex string");

  const hash = keccak256(signature as `0x${string}`);
  const cleanSig = hash.startsWith("0x") ? hash.slice(2) : hash;
  let bytes = hexToBytes(cleanSig);

  bytes[0] &= 0b11111000;
  bytes[31] &= 0b01111111;
  bytes[31] |= 0b01000000;

  const le = bytes.reverse();
  let sk = BigInt(`0x${bytesToHex(le)}`);

  sk %= subOrder;
  if (sk === BigInt(0)) sk = BigInt(1);
  return sk;
}


