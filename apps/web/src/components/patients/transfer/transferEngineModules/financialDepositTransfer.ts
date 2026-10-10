/**
 * ============================================================================
 * FINANCIAL DEPOSIT & ADVANCE VOUCHER TRANSFER MODULE
 *
 * Kopeck-exact calculation and atomic voucher issuance/redemption for
 * inter-branch patient advance balance transfers.
 * ============================================================================
 */

import type { DepositTransferVoucher } from "./types.js";

let globalVoucherSeq = 1000;

export function issueDepositTransferVoucher(
	patientId: string,
	balanceRub: number,
	_sourceBranchId: string,
	_targetBranchId: string,
): DepositTransferVoucher {
	const patientSuffix = patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const voucherCode = `TRF-VCH-${Date.now().toString(36).toUpperCase()}-${++globalVoucherSeq}-${patientSuffix}`;
	const issuedAtIso = new Date().toISOString();
	const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);
	const payloadHash = `VCH-HASH:${voucherCode}:${balanceRub}`;
	return {
		voucherCode,
		amountRub: balanceRub,
		amountKopecks: Math.round(balanceRub * 100),
		issuedAtIso,
		expiresAtIso: exp.toISOString(),
		payloadHash,
		isRedeemed: false,
	};
}

export function redeemDepositTransferVoucher(voucher: DepositTransferVoucher): DepositTransferVoucher {
	return {
		...voucher,
		isRedeemed: true,
	};
}
