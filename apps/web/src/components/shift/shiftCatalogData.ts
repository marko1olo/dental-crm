/**
 * apps/web/src/components/shift/shiftCatalogData.ts
 *
 * Canonical SSOT Data Catalog & Reference Presets for Cashier Shift & Fiscal Z-Report.
 * First Principles Architecture for Russian Dental Clinics (1-5 Chairs).
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, double-click protection).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8x & 8ap: Living clinical language (No Soviet law codes in UI).
 * - Integer Kopeck Math: Strict integer kopecks (0 floating-point errors).
 * - Sweet Spot size: 300-380 lines.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";

export type ShiftStatus = "open" | "closed" | "suspended";
export type TenderType = "cash" | "card" | "sbp" | "deposit";
export type OfdDeliveryStatus = "delivered" | "pending" | "error";

export interface TenderRevenueKopecks {
	readonly cashKopecks: number;
	readonly cardKopecks: number;
	readonly sbpKopecks: number;
	readonly depositKopecks: number;
}

export interface DoctorEarningsItem {
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly specialty: string;
	readonly completedVisitsCount: number;
	readonly grossRevenueKopecks: number;
	readonly materialsCostKopecks: number;
	readonly labCostKopecks: number;
	readonly netRevenueKopecks: number;
	readonly doctorPercent: number;
	readonly wagePayableKopecks: number;
}

export interface CashShiftRecord {
	readonly id: string;
	readonly shiftNumber: number;
	readonly status: ShiftStatus;
	readonly openedAt: string;
	readonly closedAt: string | null;
	readonly cashierId: string;
	readonly cashierFullName: string;
	readonly clinicLegalName: string;
	readonly cashboxModel: string;
	readonly initialChangeFundKopecks: number;
	readonly revenue: TenderRevenueKopecks;
	readonly totalRevenueKopecks: number;
	readonly countedCashKopecks: number;
	readonly expectedCashInDrawerKopecks: number;
	readonly cashDiscrepancyKopecks: number;
	readonly isBalanced: boolean;
	readonly isTerminalReconciled: boolean;
	readonly encashmentKopecks: number;
	readonly retainedChangeFundKopecks: number;
	readonly ofdStatus: OfdDeliveryStatus;
	readonly zReportNumber: string | null;
	readonly doctorsEarnings: readonly DoctorEarningsItem[];
}

export interface ZReportPrintData {
	readonly clinicLegalName: string;
	readonly clinicAddress: string;
	readonly inn: string;
	readonly kktSerialNumber: string;
	readonly fnSerialNumber: string;
	readonly shiftNumber: number;
	readonly zReportNumber: string;
	readonly cashierFullName: string;
	readonly openedAt: string;
	readonly closedAt: string;
	readonly initialChangeFundRub: number;
	readonly incomeCashRub: number;
	readonly incomeCardRub: number;
	readonly incomeSbpRub: number;
	readonly incomeDepositRub: number;
	readonly grossRevenueRub: number;
	readonly encashmentRub: number;
	readonly cashInDrawerClosingRub: number;
	readonly ofdStatusRu: string;
	readonly isFiscalized: boolean;
}

/**
 * Currency integer helper: formats kopecks to readable Russian rubles string.
 */
export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return `${rub.toLocaleString("ru-RU")} ₽`;
}

/**
 * Calculates sum of all revenue channels in integer kopecks.
 */
export function calculateTotalRevenueKopecks(tenders: TenderRevenueKopecks): number {
	return (
		Math.max(0, tenders.cashKopecks) +
		Math.max(0, tenders.cardKopecks) +
		Math.max(0, tenders.sbpKopecks) +
		Math.max(0, tenders.depositKopecks)
	);
}

/**
 * Expected cash in drawer formula:
 * Initial change fund + Cash income received during the shift.
 */
export function calculateExpectedCashInDrawerKopecks(
	initialChangeKopecks: number,
	cashIncomeKopecks: number,
): number {
	return Math.max(0, initialChangeKopecks) + Math.max(0, cashIncomeKopecks);
}

/**
 * Encashment calculation with change retention option.
 */
export function calculateEncashmentKopecks(
	countedCashKopecks: number,
	option: "full" | "retain_change",
	retainedChangeFundKopecks: number,
): number {
	if (option === "full") {
		return Math.max(0, countedCashKopecks);
	}
	return Math.max(0, countedCashKopecks - Math.max(0, retainedChangeFundKopecks));
}

/**
 * Synthesizes a clean Z-Report printable contract from a closed shift.
 */
export function buildZReportPrintData(shift: CashShiftRecord): ZReportPrintData {
	return {
		clinicLegalName: shift.clinicLegalName,
		clinicAddress: "г. Москва, ул. Стоматологическая, д. 12, корп. 1",
		inn: "7701234567",
		kktSerialNumber: "0010670001234567",
		fnSerialNumber: "9960440300123456",
		shiftNumber: shift.shiftNumber,
		zReportNumber: shift.zReportNumber || `Z-${shift.shiftNumber}`,
		cashierFullName: shift.cashierFullName,
		openedAt: shift.openedAt,
		closedAt: shift.closedAt || new Date().toISOString(),
		initialChangeFundRub: kopecksToRub(shift.initialChangeFundKopecks),
		incomeCashRub: kopecksToRub(shift.revenue.cashKopecks),
		incomeCardRub: kopecksToRub(shift.revenue.cardKopecks),
		incomeSbpRub: kopecksToRub(shift.revenue.sbpKopecks),
		incomeDepositRub: kopecksToRub(shift.revenue.depositKopecks),
		grossRevenueRub: kopecksToRub(shift.totalRevenueKopecks),
		encashmentRub: kopecksToRub(shift.encashmentKopecks),
		cashInDrawerClosingRub: kopecksToRub(
			shift.countedCashKopecks - shift.encashmentKopecks,
		),
		ofdStatusRu:
			shift.ofdStatus === "delivered"
				? "Доставлен в ОФД ✓"
				: "Ожидает подтверждения",
		isFiscalized: true,
	};
}

// ---------------------------------------------------------------------------
// 1-CLICK TEST & DEMO PRESETS (FIRST PRINCIPLES РФ 1-5 КРЕСЕЛ)
// ---------------------------------------------------------------------------

/**
 * Preset 1: Active daytime shift in 2-3 chair clinic.
 * Shift #104, 45 000 ₽ total revenue, cash drawer ready for reconciliation.
 */
export const ACTIVE_SHIFT_PRESET: CashShiftRecord = {
	id: "sh-104",
	shiftNumber: 104,
	status: "open",
	openedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
	closedAt: null,
	cashierId: "usr-admin-1",
	cashierFullName: "Иванова Екатерина Сергеевна",
	clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	cashboxModel: "Кассовый аппарат №1 (Фискальный регистратор)",
	initialChangeFundKopecks: rubToKopecks(5000),
	revenue: {
		cashKopecks: rubToKopecks(12500),
		cardKopecks: rubToKopecks(28000),
		sbpKopecks: rubToKopecks(4500),
		depositKopecks: rubToKopecks(0),
	},
	totalRevenueKopecks: rubToKopecks(45000),
	countedCashKopecks: rubToKopecks(17500), // 5000 change + 12500 cash
	expectedCashInDrawerKopecks: rubToKopecks(17500),
	cashDiscrepancyKopecks: 0,
	isBalanced: true,
	isTerminalReconciled: true,
	encashmentKopecks: rubToKopecks(12500),
	retainedChangeFundKopecks: rubToKopecks(5000),
	ofdStatus: "delivered",
	zReportNumber: null,
	doctorsEarnings: [
		{
			doctorId: "doc-1",
			doctorFullName: "Смирнов Алексей Викторович",
			specialty: "Стоматолог-терапевт",
			completedVisitsCount: 4,
			grossRevenueKopecks: rubToKopecks(32000),
			materialsCostKopecks: rubToKopecks(3200),
			labCostKopecks: 0,
			netRevenueKopecks: rubToKopecks(28800),
			doctorPercent: 25,
			wagePayableKopecks: rubToKopecks(7200),
		},
		{
			doctorId: "doc-2",
			doctorFullName: "Ковалева Анна Андреевна",
			specialty: "Стоматолог-хирург",
			completedVisitsCount: 2,
			grossRevenueKopecks: rubToKopecks(13000),
			materialsCostKopecks: rubToKopecks(1300),
			labCostKopecks: 0,
			netRevenueKopecks: rubToKopecks(11700),
			doctorPercent: 30,
			wagePayableKopecks: rubToKopecks(3510),
		},
	],
};

/**
 * Preset 2: Balanced shift ready for 1-click closing and Z-Report print.
 */
export const BALANCED_CLOSING_PRESET: CashShiftRecord = {
	...ACTIVE_SHIFT_PRESET,
	countedCashKopecks: rubToKopecks(17500),
	cashDiscrepancyKopecks: 0,
	isBalanced: true,
	isTerminalReconciled: true,
};

/**
 * Preset 3: Soft tolerance discrepancy shift (+500 ₽ surplus, e.g. tips or cashier error).
 * Mandate 8e: Non-blocking close, difference recorded in audit log.
 */
export const DISCREPANCY_CLOSING_PRESET: CashShiftRecord = {
	...ACTIVE_SHIFT_PRESET,
	countedCashKopecks: rubToKopecks(18000),
	cashDiscrepancyKopecks: rubToKopecks(500),
	isBalanced: false,
	isTerminalReconciled: true,
};

/**
 * Preset 4: Solo Doctor chair rental / self-employed (Mandate 8n).
 * 1 chair, instant daily cash-out, 0 bureaucratic hurdles.
 */
export const SOLO_DOCTOR_SHIFT_PRESET: CashShiftRecord = {
	id: "sh-solo-1",
	shiftNumber: 12,
	status: "open",
	openedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
	closedAt: null,
	cashierId: "usr-solo-doc",
	cashierFullName: "Д-р Кузнецов Павел Николаевич (Аренда кресла)",
	clinicLegalName: "ИП Кузнецов П.Н.",
	cashboxModel: "Мобильный фискальный терминал 54-ФЗ",
	initialChangeFundKopecks: rubToKopecks(2000),
	revenue: {
		cashKopecks: rubToKopecks(8000),
		cardKopecks: rubToKopecks(16000),
		sbpKopecks: rubToKopecks(6000),
		depositKopecks: 0,
	},
	totalRevenueKopecks: rubToKopecks(30000),
	countedCashKopecks: rubToKopecks(10000),
	expectedCashInDrawerKopecks: rubToKopecks(10000),
	cashDiscrepancyKopecks: 0,
	isBalanced: true,
	isTerminalReconciled: true,
	encashmentKopecks: rubToKopecks(8000),
	retainedChangeFundKopecks: rubToKopecks(2000),
	ofdStatus: "delivered",
	zReportNumber: null,
	doctorsEarnings: [
		{
			doctorId: "usr-solo-doc",
			doctorFullName: "Кузнецов Павел Николаевич",
			specialty: "Стоматолог-ортопед",
			completedVisitsCount: 3,
			grossRevenueKopecks: rubToKopecks(30000),
			materialsCostKopecks: rubToKopecks(4000),
			labCostKopecks: rubToKopecks(6000),
			netRevenueKopecks: rubToKopecks(20000),
			doctorPercent: 100, // Solo doctor keeps 100% of profit after lab & materials
			wagePayableKopecks: rubToKopecks(20000),
		},
	],
};

/**
 * Historical Journal Fixtures: Shifts #101, #102, #103, #104.
 */
export const SHIFT_JOURNAL_FIXTURES: readonly CashShiftRecord[] = [
	ACTIVE_SHIFT_PRESET,
	{
		id: "sh-103",
		shiftNumber: 103,
		status: "closed",
		openedAt: new Date(Date.now() - 28 * 3600000).toISOString(),
		closedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
		cashierId: "usr-admin-1",
		cashierFullName: "Иванова Екатерина Сергеевна",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		cashboxModel: "Кассовый аппарат №1 (Фискальный регистратор)",
		initialChangeFundKopecks: rubToKopecks(5000),
		revenue: {
			cashKopecks: rubToKopecks(24200),
			cardKopecks: rubToKopecks(52000),
			sbpKopecks: rubToKopecks(8000),
			depositKopecks: 0,
		},
		totalRevenueKopecks: rubToKopecks(84200),
		countedCashKopecks: rubToKopecks(29200),
		expectedCashInDrawerKopecks: rubToKopecks(29200),
		cashDiscrepancyKopecks: 0,
		isBalanced: true,
		isTerminalReconciled: true,
		encashmentKopecks: rubToKopecks(24200),
		retainedChangeFundKopecks: rubToKopecks(5000),
		ofdStatus: "delivered",
		zReportNumber: "Z-103",
		doctorsEarnings: [],
	},
	{
		id: "sh-102",
		shiftNumber: 102,
		status: "closed",
		openedAt: new Date(Date.now() - 52 * 3600000).toISOString(),
		closedAt: new Date(Date.now() - 42 * 3600000).toISOString(),
		cashierId: "usr-admin-1",
		cashierFullName: "Иванова Екатерина Сергеевна",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		cashboxModel: "Кассовый аппарат №1 (Фискальный регистратор)",
		initialChangeFundKopecks: rubToKopecks(5000),
		revenue: {
			cashKopecks: rubToKopecks(18500),
			cardKopecks: rubToKopecks(43000),
			sbpKopecks: rubToKopecks(6500),
			depositKopecks: rubToKopecks(3000),
		},
		totalRevenueKopecks: rubToKopecks(71000),
		countedCashKopecks: rubToKopecks(23500),
		expectedCashInDrawerKopecks: rubToKopecks(23500),
		cashDiscrepancyKopecks: 0,
		isBalanced: true,
		isTerminalReconciled: true,
		encashmentKopecks: rubToKopecks(18500),
		retainedChangeFundKopecks: rubToKopecks(5000),
		ofdStatus: "delivered",
		zReportNumber: "Z-102",
		doctorsEarnings: [],
	},
	{
		id: "sh-101",
		shiftNumber: 101,
		status: "closed",
		openedAt: new Date(Date.now() - 76 * 3600000).toISOString(),
		closedAt: new Date(Date.now() - 66 * 3600000).toISOString(),
		cashierId: "usr-admin-2",
		cashierFullName: "Петрова Ольга Дмитриевна",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		cashboxModel: "Кассовый аппарат №1 (Фискальный регистратор)",
		initialChangeFundKopecks: rubToKopecks(5000),
		revenue: {
			cashKopecks: rubToKopecks(15000),
			cardKopecks: rubToKopecks(31000),
			sbpKopecks: rubToKopecks(4000),
			depositKopecks: 0,
		},
		totalRevenueKopecks: rubToKopecks(50000),
		countedCashKopecks: rubToKopecks(20000),
		expectedCashInDrawerKopecks: rubToKopecks(20000),
		cashDiscrepancyKopecks: 0,
		isBalanced: true,
		isTerminalReconciled: true,
		encashmentKopecks: rubToKopecks(15000),
		retainedChangeFundKopecks: rubToKopecks(5000),
		ofdStatus: "delivered",
		zReportNumber: "Z-101",
		doctorsEarnings: [],
	},
];
