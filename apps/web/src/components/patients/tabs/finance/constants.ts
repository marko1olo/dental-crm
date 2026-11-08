import type { DepositOperationRecord } from "./types";

export const PRESET_TOPUP_AMOUNTS = [1000, 5000, 10000, 20000] as const;
export const PRESET_CHARGE_AMOUNTS = [1000, 5000, 10000] as const;

export const INITIAL_DEPOSIT_OPERATIONS: DepositOperationRecord[] = [];
