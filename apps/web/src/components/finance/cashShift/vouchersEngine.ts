/**
 * vouchersEngine.ts — Statutory Cash Documents Generator (KO-1, KO-2, Encashment & Closing Act).
 * Mandate 8b: <= 120 lines.
 */
import { DEFAULT_CLINIC_FISCAL_DETAILS, type ClinicFiscalDetails, type CashDenominations } from "./types";
import type {
	CashShiftReconciliationResult,
	EncashmentStatementData,
	Ko1CashInflowVoucher,
	Ko2CashOutflowVoucher,
	ShiftClosingActData,
} from "./reconciliationTypes";
import { convertRubToWordsRu } from "./numberToWordsRu";

export function generateKo1Voucher(p: {
	readonly docNumber: string;
	readonly amountRub: number;
	readonly receivedFrom: string;
	readonly basisRu: string;
	readonly cashierFullName: string;
	readonly clinic?: Partial<ClinicFiscalDetails>;
	readonly dateIso?: string;
}): Ko1CashInflowVoucher {
	const now = p.dateIso ? new Date(p.dateIso) : new Date();
	const clinic: ClinicFiscalDetails = { ...DEFAULT_CLINIC_FISCAL_DETAILS, ...(p.clinic || {}) };
	return {
		docNumber: p.docNumber,
		dateIso: now.toISOString(),
		dateRu: now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
		clinic,
		receivedFrom: p.receivedFrom,
		basisRu: p.basisRu,
		amountRub: p.amountRub,
		amountWordsRu: convertRubToWordsRu(p.amountRub),
		cashierFullName: p.cashierFullName,
		chiefAccountantFullName: clinic.chiefAccountantFullName,
	};
}

export function generateKo2Voucher(p: {
	readonly docNumber: string;
	readonly amountRub: number;
	readonly issuedTo: string;
	readonly basisRu: string;
	readonly cashierFullName: string;
	readonly recipientPassportRu?: string;
	readonly clinic?: Partial<ClinicFiscalDetails>;
	readonly dateIso?: string;
}): Ko2CashOutflowVoucher {
	const now = p.dateIso ? new Date(p.dateIso) : new Date();
	const clinic: ClinicFiscalDetails = { ...DEFAULT_CLINIC_FISCAL_DETAILS, ...(p.clinic || {}) };
	return {
		docNumber: p.docNumber,
		dateIso: now.toISOString(),
		dateRu: now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
		clinic,
		issuedTo: p.issuedTo,
		basisRu: p.basisRu,
		amountRub: p.amountRub,
		amountWordsRu: convertRubToWordsRu(p.amountRub),
		recipientPassportRu: p.recipientPassportRu,
		cashierFullName: p.cashierFullName,
		chiefAccountantFullName: clinic.chiefAccountantFullName,
		chiefExecutiveFullName: clinic.chiefExecutiveFullName,
	};
}

export function generateEncashmentStatement(p: {
	readonly shiftNumber: number;
	readonly statementNumber: string;
	readonly cashierFullName: string;
	readonly encashmentAmountRub: number;
	readonly denominations: CashDenominations;
	readonly destination?: "main_cash_desk" | "bank_collector" | "clinic_safe";
	readonly bagNumber?: string;
	readonly sealNumber?: string;
	readonly clinic?: Partial<ClinicFiscalDetails>;
}): EncashmentStatementData {
	const clinic: ClinicFiscalDetails = { ...DEFAULT_CLINIC_FISCAL_DETAILS, ...(p.clinic || {}) };
	const dest = p.destination || "clinic_safe";
	const destLabels = {
		main_cash_desk: "Главная касса организации",
		bank_collector: "Служба инкассации банка (ПАО Сбербанк)",
		clinic_safe: "Огнеупорный сейф клиники",
	};
	return {
		statementNumber: p.statementNumber,
		dateIso: new Date().toISOString(),
		dateRu: new Date().toLocaleDateString("ru-RU"),
		shiftNumber: p.shiftNumber,
		clinic,
		cashierFullName: p.cashierFullName,
		encashmentAmountRub: p.encashmentAmountRub,
		encashmentAmountWordsRu: convertRubToWordsRu(p.encashmentAmountRub),
		denominations: p.denominations,
		bagNumber: p.bagNumber || "—",
		sealNumber: p.sealNumber || "—",
		destination: dest,
		destinationLabel: destLabels[dest],
	};
}

export function generateShiftClosingAct(p: {
	readonly reconciliation: CashShiftReconciliationResult;
	readonly actNumber?: string;
	readonly clinic?: Partial<ClinicFiscalDetails>;
}): ShiftClosingActData {
	return {
		actNumber: p.actNumber || `АКТ-ЗКС-${p.reconciliation.shiftNumber}`,
		dateRu: new Date(p.reconciliation.closedAtIso).toLocaleDateString("ru-RU"),
		reconciliation: p.reconciliation,
		clinic: { ...DEFAULT_CLINIC_FISCAL_DETAILS, ...(p.clinic || {}) },
	};
}
