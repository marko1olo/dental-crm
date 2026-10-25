/**
 * types.ts — Контракты типов мобильного кошелька сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
} from "../../../pages/payoutDashboard/types.js";

export type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
};

export { formatMonthLabel, formatShiftDate } from "./dateUtils.js";
export {
	DEMO_SHOWCASE_DOCTOR,
	DEMO_SHOWCASE_SOLO_DOCTOR,
	DEMO_SHOWCASE_REPORT,
} from "./demoShowcaseData.js";

export interface DoctorPayoutMobileWalletProps {
	readonly report: DoctorPayoutReport | null;
	readonly month: string;
	readonly onMonthChange: (newMonth: string) => void;
	readonly onRefresh: () => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
	readonly canEditRates: boolean;
	readonly onEditRate?: (doctorUserId: string) => void;
	readonly isLoading: boolean;
	readonly onRequestPayout?: (doctor: DoctorPayoutRow, amountKopecks: number) => void;
}

export type CategoryIconType =
	| "therapy"
	| "ortho"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "deduction";

export interface CategoryCardItem {
	readonly id: string;
	readonly name: string;
	readonly iconType: CategoryIconType;
	readonly badge?: string;
	readonly ratePct: number | null;
	readonly grossRevenueRub: number;
	readonly amountRub: number;
	readonly isDeduction?: boolean;
}

export interface ShiftSummaryItem {
	readonly date: string;
	readonly formattedDate: string;
	readonly dayOfWeek: string;
	readonly visits: readonly DoctorPayoutVisit[];
	readonly patientCount: number;
	readonly estimatedHours: number;
	readonly shiftRevenueRub: number;
	readonly shiftEarnedRub: number;
}

export type PayoutWithdrawalStatus = "pending" | "approved" | "processed" | "rejected";
export type PayoutWithdrawalMethod = "sbp" | "cash_desk" | "bank_account";

export interface DoctorPayoutWithdrawalRequest {
	readonly id: string;
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly amountKopecks: number;
	readonly status: PayoutWithdrawalStatus;
	readonly method: PayoutWithdrawalMethod;
	readonly createdAt: string;
	readonly processedAt?: string | null;
	readonly note?: string;
}

export interface DoctorCategoryRateDetail {
	readonly categoryId: string;
	readonly categoryName: string;
	readonly ratePct: number;
	readonly grossKopecks: number;
	readonly earnedKopecks: number;
}
