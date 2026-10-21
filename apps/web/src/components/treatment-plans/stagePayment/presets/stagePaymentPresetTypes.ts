/**
 * stagePaymentPresetTypes.ts — Типы данных и интерфейсы поэтапной оплаты планов лечения.
 */

export type StagePaymentKind =
	| "stage_1_sanitation_therapy"
	| "stage_2_surgery_implant"
	| "stage_3_orthopedic_prosthetics"
	| "stage_4_orthodontics_braces"
	| "stage_5_periodontics_maintenance";

export type StagePaymentStatus =
	| "draft"          // Черновик сметы этапа (не оплачен)
	| "advance_paid"   // Внесен аванс / предоплата по этапу
	| "in_progress"    // Этап в работе, средства заблокированы в эскроу клиники
	| "act_completed"  // Подписан Акт сдачи-приемки выполненных работ (ст. 720 ГК РФ)
	| "fully_paid"     // Произведен полный окончательный расчет
	| "refunded";      // Договор расторгнут, оформлен возврат по ст. 32 Закона № 2300-1

export type FiscalAdvanceTag = "PREPAYMENT_100" | "PREPAYMENT_PARTIAL" | "FULL_SETTLEMENT";

export interface StagePaymentPreset {
	readonly kind: StagePaymentKind;
	readonly stageNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly clinicalGoalRu: string;
	readonly legalBasisRu: string;
	readonly defaultAdvancePercent: number; // 0-100%
	readonly defaultCompletionPercent: number; // 0-100%
	readonly installmentsAllowed: boolean;
	readonly defaultInstallmentMonths?: number;
	readonly cadCamLabSharePercent?: number; // Доля затрат зуботехнической лаборатории
	readonly implantHardwareSharePercent?: number; // Доля титановых имплантатов/компонентов
	readonly fiscalAdvanceTag: FiscalAdvanceTag;
	readonly statutoryRequirements: readonly string[];
	readonly clinicalMilestones: readonly string[];
	readonly defaultItemsSummary: string;
}

export interface StageStatusUiMeta {
	readonly labelRu: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly iconName: string;
	readonly descriptionRu: string;
}
