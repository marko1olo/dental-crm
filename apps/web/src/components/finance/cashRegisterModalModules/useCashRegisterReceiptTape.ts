import { useMemo } from "react";
import {
	type Ffd12ShiftCloseZReportSummary,
	type FiscalTapeWidth,
	generate54FzZReportReceiptTapeText,
} from "../fiscal/fiscal54fzEngine.js";

export interface ReceiptTapeParams {
	readonly summary: Ffd12ShiftCloseZReportSummary;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly tapeWidth: FiscalTapeWidth;
}

export function useCashRegisterReceiptTape(params: ReceiptTapeParams): string {
	const {
		summary,
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "",
		clinicKpp = "",
		clinicAddress = "г. Москва, ул. Клиническая, д. 10",
		cashierFullName = "Дежурный администратор",
		cashierInn = "",
		kktRegNumber = "0004829104058291",
		kktSerialNumber = "019482019482",
		fnSerial = "9960440302145896",
		fiscalDocNumber = "00042",
		fiscalSign = "3920194821",
		ofdName = "АО «ПЕРВЫЙ ОФД»",
		tapeWidth,
	} = params;

	return useMemo(
		() =>
			generate54FzZReportReceiptTapeText({
				summary,
				clinicLegalName,
				clinicInn,
				clinicKpp,
				clinicAddress,
				cashierFullName,
				cashierInn,
				kktRegNumber,
				kktSerialNumber,
				fnSerial,
				fiscalDocNumber,
				fiscalSign,
				ofdName,
				tapeWidth,
			}),
		[
			summary,
			clinicLegalName,
			clinicInn,
			clinicKpp,
			clinicAddress,
			cashierFullName,
			cashierInn,
			kktRegNumber,
			kktSerialNumber,
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			ofdName,
			tapeWidth,
		],
	);
}
