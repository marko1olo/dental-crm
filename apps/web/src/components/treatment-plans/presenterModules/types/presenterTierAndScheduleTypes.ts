/**
 * presenterTierAndScheduleTypes.ts — Типы опций тарифов и графиков оплат презентера (DENTE CRM).
 */

import type { TreatmentPlanTierId } from "../../types";

/** Категория клинического этапа по номенклатуре СтАР / услуг */
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
