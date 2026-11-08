/**
 * types.ts — Контракты типов мобильного кошелька сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

export type DoctorPayoutState =
	| "computed"
	| "rate_missing"
	| "rate_invalid"
	| "material_policy_missing";

export type DoctorPayoutMaterialsState = "counted" | "no_movements" | "cost_missing";

export type DoctorPayoutVisitService = {
	readonly id: string;
	readonly title: string;
	readonly order804nCode: string | null;
	readonly toothCode: string | null;
	readonly priceRub: number;
	readonly quantity: number;
};

export type DoctorPayoutVisitMaterial = {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly unit: string;
	readonly unitCostRub: number;
	readonly totalCostRub: number;
	readonly isOverheadConsumable?: boolean;
	readonly coveredByClinic?: boolean;
};

export type DoctorPayoutVisit = {
	readonly visitId: string;
	readonly appointmentId: string | null;
	readonly paidAt: string;
	readonly visitDate: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly revenueRub: number;
	readonly paymentCount: number;
	readonly services: DoctorPayoutVisitService[];
	readonly materials: DoctorPayoutVisitMaterial[];
};

export type DoctorPayoutLabOrder = {
	readonly id: string;
	readonly orderNumber: string;
	readonly toothFdi: string | null;
	readonly restorationType: string;
	readonly material: string | null;
	readonly patientName: string;
	readonly status: string;
	readonly completedAt: string | null;
	readonly priceRub: number;
	readonly withheldRub: number;
	readonly deductionPct: number;
};

export type DoctorPayoutRow = {
	doctorUserId: string;
	doctorName: string;
	role: string;
	isActive: boolean;
	revenueRub: number;
	paymentCount: number;
	materialCostRub: number;
	materialMovements: number;
	materialMovementsUnpriced: number;
	materialsState: DoctorPayoutMaterialsState;
	labCostRub?: number;
	labOrdersCount?: number;
	withheldLabRub?: number | null;
	commissionPct: number | null;
	materialDeductionPct: number | null;
	labDeductionPct?: number | null;
	rateEffectiveFrom: string | null;
	rateRowCount: number;
	state: DoctorPayoutState;
	accruedRub: number | null;
	withheldMaterialRub: number | null;
	payoutRub: number | null;
	note: string;
	visits?: DoctorPayoutVisit[];
	labOrders?: DoctorPayoutLabOrder[];
};

export type DoctorPayoutTotals = {
	revenueRub: number;
	paymentCount: number;
	attributableRevenueRub: number;
	unattributedRevenueRub: number;
	materialCostRub: number;
	labCostRub?: number;
	accruedRub: number;
	withheldMaterialRub: number;
	withheldLabRub?: number;
	payoutRub: number;
	doctorsCounted: number;
	doctorsWithoutRate: number;
};

export type DoctorPayoutReport = {
	scope: "all" | "own";
	period: { from: string; to: string };
	rows: DoctorPayoutRow[];
	totals: DoctorPayoutTotals;
	methodNote: string;
	limitations: string[];
	isEmpty: boolean;
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
