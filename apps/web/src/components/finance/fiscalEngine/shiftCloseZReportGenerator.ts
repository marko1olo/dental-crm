import { type Kopecks, kopecksToRubles, parseKopecks } from "@dental/shared";
import type { ShiftCloseZReportResult } from "./types";

export interface GenerateShiftCloseZReportParams {
	readonly shiftNumber?: number | undefined;
	readonly openDateIso?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly summary: {
		readonly receivedRub: number;
		readonly receivedCount: number;
		readonly cashRub: number;
		readonly advanceRub: number;
		readonly familyWalletRub: number;
		readonly refundedRub: number;
		readonly refundedCount: number;
		readonly byMethod: readonly { readonly method: string; readonly amountRub: number; readonly count: number }[];
	};
}

export function generateShiftCloseZReport(params: GenerateShiftCloseZReportParams): ShiftCloseZReportResult {
	const {
		shiftNumber = 142, openDateIso = new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
		cashierFullName = "Сидорова Анна Павловна", cashierInn = "771234567890", clinicLegalName = "ООО «ДЕНТЕ КЛИНИКА»",
		clinicInn = "7707083893", clinicKpp = "770101001", clinicAddress = "г. Москва, ул. Профсоюзная, д. 42",
		kktRegNumber = "0004589210034821", kktSerialNumber = "0184920042", fnSerial = "9960440301234567",
		ofdName = "ООО «Платформа ОФД»", summary,
	} = params;

	const now = new Date();
	let cardRub = 0;
	let sbpRub = 0;
	for (const row of summary.byMethod) {
		if (row.method === "card") cardRub += row.amountRub;
		else if (row.method === "online") sbpRub += row.amountRub;
	}

	const incomeCashKopecks = parseKopecks(summary.cashRub);
	const incomeCardKopecks = parseKopecks(cardRub);
	const incomeSbpKopecks = parseKopecks(sbpRub);
	const incomeAdvanceOffsetKopecks = parseKopecks(summary.familyWalletRub);
	const incomeTotalKopecks = parseKopecks(summary.receivedRub + summary.familyWalletRub);
	const incomeReturnCardKopecks = parseKopecks(summary.refundedRub);
	const incomeReturnTotalKopecks = parseKopecks(summary.refundedRub);
	const totalRevenueKopecks = Math.max(0, incomeTotalKopecks - incomeReturnTotalKopecks) as Kopecks;
	const totalRevenueRub = kopecksToRubles(totalRevenueKopecks);
	const fiscalDocumentNumber = `200${shiftNumber}`;
	const fiscalSign = `100000000${shiftNumber}`;

	return {
		reportNumber: `З-ОТЧЕТ-${shiftNumber}`, shiftNumber, openDateIso, closeDateIso: now.toISOString(),
		closeDateRu: now.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
		clinicLegalName, clinicInn, clinicKpp, clinicAddress, cashierFullName, cashierInn,
		kktRegNumber, kktSerialNumber, fnSerial, fiscalDocumentNumber, fiscalSign, ofdName,
		ofdUrl: `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${totalRevenueRub.toFixed(2)}&n=1`,
		incomeCount: summary.receivedCount, incomeTotalRub: kopecksToRubles(incomeTotalKopecks), incomeTotalKopecks,
		incomeCashRub: summary.cashRub, incomeCashKopecks, incomeCardRub: cardRub, incomeCardKopecks,
		incomeSbpRub: sbpRub, incomeSbpKopecks, incomeAdvanceOffsetRub: summary.familyWalletRub, incomeAdvanceOffsetKopecks,
		incomeReturnCount: summary.refundedCount, incomeReturnTotalRub: kopecksToRubles(incomeReturnTotalKopecks), incomeReturnTotalKopecks,
		incomeReturnCashRub: 0, incomeReturnCashKopecks: parseKopecks(0),
		incomeReturnCardRub: summary.refundedRub, incomeReturnCardKopecks,
		correctionCount: 0, correctionTotalRub: 0, totalRevenueRub, totalRevenueKopecks,
		cashInDrawerCalculatedRub: summary.cashRub, unprintedDocumentsCount: 0, isShiftExpired24h: false, fnResourceDaysRemaining: 420,
	};
}

export const generateShiftCloseZReport54Fz = generateShiftCloseZReport;
