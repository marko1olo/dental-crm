/**
 * patientScoring.ts — Deterministic Patient Scoring & Sentiment Engine for Dentalpin Agentic Core.
 *
 * Implements:
 * - Deterministic Patient Lifetime Value (LTV) calculation in RUB via Decimal.js.
 * - Accurate No-Show & Cancellation Rate (%) calculation.
 * - Clinical & Administrative Compliance Index (0–100 score).
 * - Multi-tier Sentiment Status for Doctor/Receptionist Hover HUD:
 *   * "🟢 VIP / Лояльный"
 *   * "🔵 Стандартный"
 *   * "🟡 Внимание: Риск отмены"
 *   * "🔴 Осторожно: Требуется строгое ИДС"
 * - Actionable staff alerts and risk factors.
 */

import { Decimal } from "decimal.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	patientConsents,
	patients,
	payments,
	treatmentPlans,
	visits,
} from "../../db/schema.js";
import type { AgentContext } from "./context.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export type PatientSentimentStatus =
	| "🟢 VIP / Лояльный"
	| "🔵 Стандартный"
	| "🟡 Внимание: Риск отмены"
	| "🔴 Осторожно: Требуется строгое ИДС";

export interface PatientScoringRawData {
	readonly patientId: string;
	readonly organizationId?: string | undefined;
	readonly appointments: ReadonlyArray<{
		readonly id: string;
		readonly status: string;
		readonly startsAt: Date | string;
		readonly endsAt?: Date | string | undefined;
	}>;
	readonly payments: ReadonlyArray<{
		readonly id: string;
		readonly amountRub: number | string;
		readonly status: string;
		readonly paidAt: Date | string;
	}>;
	readonly visits?: ReadonlyArray<{
		readonly id: string;
		readonly status: string;
		readonly createdAt: Date | string;
	}> | undefined;
	readonly treatmentPlans?: ReadonlyArray<{
		readonly id: string;
		readonly status: string;
		readonly totalPriceRub?: number | string | undefined;
	}> | undefined;
	readonly hasSignedConsents?: boolean | undefined;
	readonly hasLegalConflicts?: boolean | undefined;
	readonly outstandingDebtRub?: number | undefined;
}

export interface PatientScoringResult {
	readonly patientId: string;
	readonly ltvRub: number;
	readonly ltvKopecks: number;
	readonly noShowRate: number;
	readonly complianceIndex: number;
	readonly sentimentStatus: PatientSentimentStatus;
	readonly metrics: {
		readonly totalAppointmentsCount: number;
		readonly completedAppointmentsCount: number;
		readonly cancelledAppointmentsCount: number;
		readonly noShowAppointmentsCount: number;
		readonly plannedAppointmentsCount: number;
		readonly totalPaymentsCount: number;
		readonly averageCheckRub: number;
		readonly outstandingDebtRub: number;
		readonly completedTreatmentPlansCount: number;
		readonly signedVisitsCount: number;
		readonly hasSignedConsents: boolean;
		readonly lastVisitDate: string | null;
	};
	readonly riskFactors: readonly string[];
	readonly recommendationsForStaff: readonly string[];
	readonly generatedAt: string;
}

// ─── PURE DETERMINISTIC SCORING ENGINE ──────────────────────────────────────

/**
 * Deterministically computes patient scoring, LTV, no-show rate, compliance index, and sentiment status.
 */
export function calculatePatientScoring(data: PatientScoringRawData): PatientScoringResult {
	const rawAppointments = data.appointments || [];
	const rawPayments = data.payments || [];
	const rawVisits = data.visits || [];
	const rawPlans = data.treatmentPlans || [];

	// 1. Calculate LTV in RUB and Kopecks (only completed/paid payments)
	let totalPaidDec = new Decimal(0);
	let validPaymentsCount = 0;

	for (const p of rawPayments) {
		const isPaid = p.status.toLowerCase() === "paid" || p.status.toLowerCase() === "completed";
		if (isPaid) {
			const amt = new Decimal(p.amountRub || 0);
			if (amt.isPositive()) {
				totalPaidDec = totalPaidDec.plus(amt);
				validPaymentsCount++;
			}
		}
	}

	const ltvRub = totalPaidDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
	const ltvKopecks = totalPaidDec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
	const averageCheckRub =
		validPaymentsCount > 0
			? totalPaidDec.dividedBy(validPaymentsCount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
			: 0;

	// 2. Calculate Appointment Statistics & No-Show Rate
	let completedCount = 0;
	let cancelledCount = 0;
	let noShowCount = 0;
	let plannedCount = 0;

	let lastVisitTimeMs = 0;

	for (const appt of rawAppointments) {
		const s = (appt.status || "").toLowerCase().trim();
		const dateObj = appt.startsAt instanceof Date ? appt.startsAt : new Date(appt.startsAt);
		const timeMs = Number.isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

		if (s === "completed" || s === "arrived" || s === "in_treatment") {
			completedCount++;
			if (timeMs > lastVisitTimeMs) {
				lastVisitTimeMs = timeMs;
			}
		} else if (s === "cancelled") {
			cancelledCount++;
		} else if (s === "no_show") {
			noShowCount++;
		} else if (s === "planned" || s === "confirmed") {
			plannedCount++;
		}
	}

	const totalPastEvaluated = completedCount + cancelledCount + noShowCount;
	const noShowRate =
		totalPastEvaluated === 0
			? 0
			: Math.round(((cancelledCount + noShowCount) / totalPastEvaluated) * 1000) / 10;

	// 3. Calculate Clinical Metrics
	let signedVisitsCount = 0;
	let voidedVisitsCount = 0;
	for (const v of rawVisits) {
		const s = (v.status || "").toLowerCase().trim();
		if (s === "signed") signedVisitsCount++;
		if (s === "voided") voidedVisitsCount++;
	}

	let completedPlansCount = 0;
	for (const plan of rawPlans) {
		const s = (plan.status || "").toLowerCase().trim();
		if (s === "completed") completedPlansCount++;
	}

	const hasSignedConsents = data.hasSignedConsents ?? signedVisitsCount > 0;
	const outstandingDebtRub = data.outstandingDebtRub ?? 0;

	// 4. Calculate Compliance Index (0–100)
	let score = 100;

	// Deductions
	score -= noShowCount * 15;
	score -= cancelledCount * 8;
	score -= voidedVisitsCount * 20;

	if (data.hasLegalConflicts) {
		score -= 30;
	}
	if (outstandingDebtRub > 0) {
		score -= outstandingDebtRub > 10000 ? 15 : 8;
	}
	if (!hasSignedConsents && completedCount > 0) {
		score -= 10;
	}

	// Loyalty and compliance bonuses
	if (completedCount >= 3) {
		score += Math.min(15, completedCount * 3);
	}
	if (completedPlansCount > 0) {
		score += Math.min(15, completedPlansCount * 5);
	}
	if (ltvRub >= 50000) {
		score += 5;
	}

	// Clamp between 0 and 100
	const complianceIndex = Math.max(0, Math.min(100, Math.round(score)));

	const pureNoShowRate =
		totalPastEvaluated === 0
			? 0
			: Math.round((noShowCount / totalPastEvaluated) * 1000) / 10;

	// 5. Determine Multi-tier Sentiment Status
	let sentimentStatus: PatientSentimentStatus;
	const riskFactors: string[] = [];
	const recommendationsForStaff: string[] = [];

	if (data.hasLegalConflicts || complianceIndex < 40 || pureNoShowRate >= 40 || noShowCount >= 2) {
		sentimentStatus = "🔴 Осторожно: Требуется строгое ИДС";
		if (data.hasLegalConflicts) {
			riskFactors.push("Зафиксированы правовые или клинические разногласия в истории пациента");
		}
		if (noShowCount >= 2 || pureNoShowRate >= 40) {
			riskFactors.push(`Критический уровень неявок (no-show): ${noShowCount} (${pureNoShowRate}%)`);
		}
		if (complianceIndex < 40) {
			riskFactors.push(`Низкий индекс комплаентности: ${complianceIndex}/100`);
		}
		recommendationsForStaff.push("Обязательно оформить и подписать расширенное ИДС до начала любых манипуляций");
		recommendationsForStaff.push("Вести полный фотопротокол и аудиофиксацию клинического приема");
		recommendationsForStaff.push("Запись на прием только по полной предоплате за бронирование кресла");
	} else if (noShowRate >= 25 || complianceIndex < 60 || cancelledCount >= 2) {
		sentimentStatus = "🟡 Внимание: Риск отмены";
		if (noShowRate >= 25) {
			riskFactors.push(`Повышенный процент отмен/неявок: ${noShowRate}%`);
		}
		if (cancelledCount >= 2) {
			riskFactors.push(`Пациент отменил ${cancelledCount} приемов в прошлом`);
		}
		if (outstandingDebtRub > 0) {
			riskFactors.push(`Имеется задолженность по оплате: ${outstandingDebtRub.toLocaleString("ru-RU")} ₽`);
		}
		recommendationsForStaff.push("Обязательный звонок-подтверждение от администратора за 24 и 2 часа до визита");
		recommendationsForStaff.push("Предложить пациенту альтернативные гибкие временные слоты");
	} else if (
		(ltvRub >= 100000 || (ltvRub >= 50000 && completedCount >= 2)) &&
		complianceIndex >= 80 &&
		noShowRate < 15 &&
		outstandingDebtRub <= 0
	) {
		sentimentStatus = "🟢 VIP / Лояльный";
		recommendationsForStaff.push("Предоставить приоритетное бронирование времени у ведущих специалистов клиники");
		recommendationsForStaff.push("Назначить персонального куратора лечения и предложить семейную программу лояльности");
	} else {
		sentimentStatus = "🔵 Стандартный";
		recommendationsForStaff.push("Стандартный регламент сопровождения и плановые напоминания о визитах");
	}

	const lastVisitDate =
		lastVisitTimeMs > 0 ? new Date(lastVisitTimeMs).toISOString().split("T")[0] : null;

	return {
		patientId: data.patientId,
		ltvRub,
		ltvKopecks,
		noShowRate,
		complianceIndex,
		sentimentStatus,
		metrics: {
			totalAppointmentsCount: rawAppointments.length,
			completedAppointmentsCount: completedCount,
			cancelledAppointmentsCount: cancelledCount,
			noShowAppointmentsCount: noShowCount,
			plannedAppointmentsCount: plannedCount,
			totalPaymentsCount: validPaymentsCount,
			averageCheckRub,
			outstandingDebtRub,
			completedTreatmentPlansCount: completedPlansCount,
			signedVisitsCount,
			hasSignedConsents,
			lastVisitDate: lastVisitDate ?? null,
		},
		riskFactors,
		recommendationsForStaff,
		generatedAt: new Date().toISOString(),
	};
}

// ─── DATABASE-LOADED SCORING HELPER ────────────────────────────────────────

/**
 * Loads patient history directly from PostgreSQL and computes deterministic scoring.
 */
export async function calculatePatientScoringFromDb(
	ctx: AgentContext,
	patientId: string,
): Promise<PatientScoringResult> {
	const targetDb = ctx.db ?? db;

	// Execute all queries in parallel via Promise.all
	const [
		patientRows,
		patientAppointments,
		patientPayments,
		patientVisits,
		patientPlans,
		patientConsentsList,
	] = await Promise.all([
		// 1. Fetch patient profile, status, and administrative notes
		targetDb
			.select({
				id: patients.id,
				status: patients.status,
				notes: patients.notes,
				administrativeProfile: patients.administrativeProfile,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, patientId),
				),
			)
			.limit(1),

		// 2. Fetch appointments
		targetDb
			.select({
				id: appointments.id,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.patientId, patientId),
				),
			)
			.orderBy(desc(appointments.startsAt)),

		// 3. Fetch payments
		targetDb
			.select({
				id: payments.id,
				amountRub: payments.amountRub,
				status: payments.status,
				paidAt: payments.paidAt,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ctx.organizationId),
					eq(payments.patientId, patientId),
				),
			),

		// 4. Fetch visits
		targetDb
			.select({
				id: visits.id,
				status: visits.status,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, ctx.organizationId),
					eq(visits.patientId, patientId),
				),
			),

		// 5. Fetch treatment plans
		targetDb
			.select({
				id: treatmentPlans.id,
				status: treatmentPlans.status,
				totalPriceRub: treatmentPlans.totalPriceRub,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, ctx.organizationId),
					eq(treatmentPlans.patientId, patientId),
				),
			),

		// 6. Fetch signed and revoked informed consents
		targetDb
			.select({
				id: patientConsents.id,
				kind: patientConsents.kind,
				grantedAt: patientConsents.grantedAt,
				revokedAt: patientConsents.revokedAt,
			})
			.from(patientConsents)
			.where(
				and(
					eq(patientConsents.organizationId, ctx.organizationId),
					eq(patientConsents.patientId, patientId),
				),
			),
	]);

	const patientRecord = patientRows[0];
	const patientNotes = (patientRecord?.notes || "").toLowerCase();
	const hasLegalNotesConflict = /конфликт|претензи|суд|юрист|жалоб|скандал|экспертиз|росздравнадзор/i.test(patientNotes);
	const hasRevokedConsents = patientConsentsList.some((c) => c.revokedAt !== null);
	const hasVoidedVisits = patientVisits.some((v) => (v.status || "").toLowerCase() === "voided");
	const isBlacklisted = (patientRecord?.status || "").toLowerCase() === "blacklisted";
	const hasSignedConsents = patientConsentsList.some((c) => c.grantedAt !== null && c.revokedAt === null);

	const hasLegalConflicts = hasLegalNotesConflict || hasRevokedConsents || hasVoidedVisits || isBlacklisted;

	const rawData: PatientScoringRawData = {
		patientId,
		organizationId: ctx.organizationId,
		appointments: patientAppointments,
		payments: patientPayments,
		visits: patientVisits,
		treatmentPlans: patientPlans,
		hasSignedConsents,
		hasLegalConflicts,
	};

	return calculatePatientScoring(rawData);
}
