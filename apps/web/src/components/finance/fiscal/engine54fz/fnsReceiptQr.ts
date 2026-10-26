import type { FnsFiscalReceiptQrParams } from "./types";

/**
 * 54-FZ FFD 1.2: Compiles the official FNS QR verification string for validation in nalog.gov.ru:
 * `t=YYYYMMDDTHHMM&s=TOTAL_RUB.KOP&fn=FN_SERIAL&i=FD_NUM&fp=FPD_SIGN&n=OPERATION_TYPE`
 */
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
