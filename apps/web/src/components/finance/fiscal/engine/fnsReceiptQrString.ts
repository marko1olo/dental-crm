/**
 * fnsReceiptQrString.ts — FNS QR Verification String Generator.
 * Mandate 8b: <= 120 lines.
 */
import type { FnsFiscalReceiptQrParams } from "../engine54fz/types";

export function buildFnsFiscalReceiptQrString(params: FnsFiscalReceiptQrParams): string {
	const dateObj = params.issuedAtIso ? new Date(params.issuedAtIso) : new Date();
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const t = `${year}${month}${day}T${hours}${minutes}`;
	const s = params.totalRubFormatted;
	const fn = params.fnSerial;
	const i = params.fiscalDocNumber;
	const fp = params.fiscalSign;
	const n = params.operationType === "income_return" ? "2" : "1";

	return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}
