// SPDX-License-Identifier: MIT

export interface DepositResult {
  success: boolean;
  transactionHash?: string;
  commitment?: string;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  amount?: bigint;
  error?: string;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  amountOut?: bigint;
  error?: string;
}


export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipientStealthData: string;
  deadline: number;
}

export interface WithdrawProof {
  proof: string;
  root: string;
  nullifier: string;
  token: string;
  amount: bigint;
  recipient: string;
}

export interface SpendProof {
  proof: string;
  root: string;
  nullifier: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipientStealthData: string;
}

