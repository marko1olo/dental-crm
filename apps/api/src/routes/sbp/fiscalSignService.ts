import type { OfdVerificationUrlParams } from "./types.js";

export class FiscalInvoiceError extends Error {
	public statusCode: number;
	public errorCode?: string;

	constructor(message: string, statusCode: number, errorCode?: string) {
		super(message);
		this.name = "FiscalInvoiceError";
		this.statusCode = statusCode;
		if (errorCode) {
			this.errorCode = errorCode;
		}
	}
}

/** Computes deterministic fiscal sign hash */
export function computeFiscalSign(
	fn: string,
	fd: string,
	date: Date,
	amountKopecks: number,
): string {
	const data = `${fn}:${fd}:${date.toISOString().slice(0, 10)}:${amountKopecks}`;
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
	}
	return `FP-${String(hash).padStart(9, "0").slice(0, 10)}`;
}

/** Builds OFD validation link for receipt verification */
export function buildOfdVerificationUrl(params: OfdVerificationUrlParams): string {
	const n = params.operationType === "income_return" ? "2" : "1";
	const sumRub = (params.amountKopecks / 100).toFixed(2);
	return `https://ofd.ru/check?fn=${encodeURIComponent(params.fn)}&fd=${encodeURIComponent(params.fd)}&fpd=${encodeURIComponent(params.fpd)}&s=${sumRub}&n=${n}`;
}
