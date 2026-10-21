/**
 * treatmentPlanPresenterTypes.ts — Канонические типы презентера планов лечения и кейсов пациента
 * (Wave 19 / Chairside Presenter Modules).
 *
 * Связан с каноническим SSOT `@dental/shared` (patientCasePresenterEngine.ts).
 */

import type {
	PatientCasePresentation,
	PatientCasePresenterInput,
	RawPlanItem,
	RoadmapStage,
} from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanWorkflowStatus,
} from "../types";

export type {
	NdflDeductionResult,
	PatientCasePresentation,
	PatientCasePresenterInput,
	RawPlanItem,
	RoadmapStage,
	ToothData,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanWorkflowStatus,
};

/** Категория клинического этапа по номенклатуре СтАР / 804н */
export type PresenterStageCategory =
	| "hygiene_prevention" // Профгигиена и профилактика
	| "therapy_sanitation" // Санация кариеса и эндодонтия
	| "surgery_implantation" // Хирургия, синус-лифтинг, имплантация
	| "orthopedics_prosthetics" // Ортопедия, коронки, виниры
	| "orthodontics" // Исправление прикуса
	| "periodontics" // Пародонтология
	| "general"; // Консультация и диагностика

/** Альтернативная опция плана лечения (3-Tier выбор для пациента) */
export interface PresenterTierOption {
	id: TreatmentPlanTierId;
	title: string;
	badge: string;
	descriptionRu: string;
	warrantyYearsText: string;
	recommended: boolean;
	totalRub: number;
	monthly12Rub: number;
	ndflRefundRub: number;
	stagesCount: number;
	durationWeeks: number;
	durationVisits: number;
}

/** Элемент графика платежей с защитой от кассовых разрывов клиники */
export interface PresenterPaymentScheduleItem {
	stepIndex: number;
	titleRu: string;
	percentage: number; // например 30, 40, 30
	amountRub: number;
	dueDateDescriptionRu: string;
	stageTargetTitleRu?: string | undefined;
	isPrepayment: boolean;
	status: "pending" | "paid" | "deferred";
}

/** Параметры графика рассрочки и комфортных оплат */
export interface PresenterInstallmentSchedule {
	totalCostRub: number;
	months: 3 | 6 | 12 | 24;
	monthlyPaymentRub: number;
	isZeroInterest: boolean; // 0% рассрочка без переплат
	taxDeduction13Rub: number; // возврат 13% НДФЛ по справке КНД 1151156
	costWithDeductionRub: number;
	stagesBreakdown: PresenterPaymentScheduleItem[];
}

/** Шкала врачебных скидок (Мандат 8e: свобода скидок врача до 100%) */
export interface PresenterDiscountConfig {
	discountPercent: number; // 0..100%
	discountAmountRub: number;
	reason?: string | undefined;
	isWarrantyRework: boolean; // гарантийная переделка 100%
}

/** Фиксация и акцепт плана пациентом у кресла */
export interface PresenterPatientAcceptance {
	isAccepted: boolean;
	acceptedTierId: TreatmentPlanTierId;
	acceptedTotalRub: number;
	patientSignatureDataUrl?: string | undefined; // цифровая подпись на тач-экране
	risksAcknowledged: boolean; // ознакомлен с рисками отказа от лечения
	agreedInstallmentMonths?: number | undefined;
	acceptedAtIso: string;
	witnessDoctorFullName: string;
}

/** Пропсы для модального окна презентации */
export interface TreatmentPlanPresenterBaseProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientId?: string | undefined;
	patientPhone?: string | undefined;
	patientBirthDate?: string | undefined;
	doctorFullName?: string | undefined;
	doctorSpecialty?: string | undefined;
	clinicName?: string | undefined;
	clinicLegalName?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
	clinicLicense?: string | undefined;
	contractNumber?: string | undefined;
	teeth?: readonly ToothData[] | undefined;
	tiers?: readonly TreatmentPlanTier[] | undefined;
	initialSelectedTierId?: TreatmentPlanTierId | undefined;
	onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	onUpdateItemPrice?:
		| ((itemId: string, newPriceRub: number) => void)
		| undefined;
	onSendStageToVisit?: ((stage: TreatmentPlanStage) => void) | undefined;
	onSendStageToInvoice?: ((stage: TreatmentPlanStage) => void) | undefined;
	onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	planCreatedAtIso?: string | undefined;
	isClosed?: boolean | undefined;
	isDraft?: boolean | undefined;
	isSigned?: boolean | undefined;
	status?: string | undefined;
	planId?: string | undefined;
	workflowStatus?: TreatmentPlanWorkflowStatus | undefined;
	watermarkText?: string | undefined;
	showAiAudit?: boolean | undefined;
	isDemoMode?: boolean | undefined;
	className?: string | undefined;
}

export type TreatmentPlanPresenterModalProps = TreatmentPlanPresenterBaseProps;
