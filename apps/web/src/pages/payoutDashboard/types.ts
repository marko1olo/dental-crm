/**
 * Layer 0: Domain Types & State Contracts for Doctor Payout Dashboard.
 */

/** Состояние расчёта по врачу. Значения приходят с сервера как есть. */
export type DoctorPayoutState =
	| "computed"
	| "rate_missing"
	| "rate_invalid"
	| "material_policy_missing";

/** Что известно про себестоимость материалов врача за период. */
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
	/** "all" — все врачи клиники, "own" — только свои строки. */
	scope: "all" | "own";
	period: { from: string; to: string };
	rows: DoctorPayoutRow[];
	totals: DoctorPayoutTotals;
	methodNote: string;
	limitations: string[];
	isEmpty: boolean;
};

/**
 * Состояние загрузки.
 *
 * «Отказ» и «пусто» — РАЗНЫЕ ветки, и объединить их нельзя: пустая таблица на
 * месте зарплаты означает «никто ничего не заработал», а это утверждение о
 * деньгах, которого сервер не делал.
 */
export type PayoutLoadState =
	| { kind: "loading" }
	| { kind: "ready"; report: DoctorPayoutReport }
	/** Сервер отказал по роли: блок не показывается вовсе. */
	| { kind: "denied" }
	/** Нет входа сотрудника — это не отказ, а незаконченный вход. */
	| { kind: "needs_staff_login"; message: string }
	/** Расчёт не выполнен. Причина и действие обязательны. */
	| { kind: "failed"; message: string; action: string };

export type CommissionSaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "failed"; message: string };

export interface DoctorPayoutDashboardProps {
	readonly initialReport?: DoctorPayoutReport | undefined;
}

export interface PayoutDashboardHeaderProps {
	readonly month: string;
	readonly onMonthChange: (month: string) => void;
	readonly onRefresh: () => void;
	readonly isLoading: boolean;
}

export interface PayoutSummaryCardsProps {
	readonly report: DoctorPayoutReport;
	readonly isOwnScope: boolean;
	readonly ownVisible: { revenueRub: number; paymentCount: number };
	readonly canEditRates: boolean;
}

export interface PayoutDoctorTableProps {
	readonly report: DoctorPayoutReport;
	readonly isOwnScope: boolean;
	readonly monthLabel: string;
	readonly canEditRates: boolean;
	readonly editingRateFor: string | null;
	readonly rateDraft: string;
	readonly rateSave: CommissionSaveState;
	readonly onStartEditRate: (doctorId: string, currentRate: number | null) => void;
	readonly onCancelEditRate: () => void;
	readonly onRateDraftChange: (draft: string) => void;
	readonly onSaveRate: (doctorId: string, raw: string) => void;
	readonly expandedDoctorId: string | null;
	readonly onToggleExpandDoctor: (doctorId: string) => void;
	readonly activeSubTabs: Record<string, "visits" | "lab">;
	readonly onSubTabChange: (doctorId: string, tab: "visits" | "lab") => void;
	readonly searchFilters: Record<string, string>;
	readonly onSearchChange: (doctorId: string, query: string) => void;
	readonly visitPages: Record<string, number>;
	readonly onPageChange: (doctorId: string, page: number) => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
}
