import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 037/у-88 — ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА
 * Приказ Минздрава СССР № 50-88 / Приказ Минздрава РФ № 804н
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Запись о принятом пациенте в листке ежедневного учета (строка таблицы 037/у) */
export const dailyPatientRecord037uSchema = z.object({
	sequenceNumber: z.number().int().min(1),
	patientFullName: z.string().trim().min(1).max(160),
	patientAge: z.number().int().min(0).max(125),
	patientCategory: z.enum(["adult", "child_under_14", "adolescent_15_17"]).default("adult"),
	medicalCardNumber: z.string().trim().min(1).max(64),
	patientAddress: z.string().trim().max(240).nullable().optional(),
	isPrimaryVisit: z.boolean().default(true), // Первичный (true) или повторный (false)
	isSanatedInVisit: z.boolean().default(false), // Санирован в данном посещении
	diagnosisIcd10: z.string().trim().min(1).max(32),
	diagnosisText: z.string().trim().min(1).max(500),
	performedProceduresSummary: z.string().trim().min(1).max(1500), // Объем выполненной работы
	uetCaries: z.number().min(0).max(50).default(0), // УЕТ за лечение кариеса
	uetPulpitisPeriodontitis: z.number().min(0).max(50).default(0), // УЕТ за эндодонтию
	uetSurgeryExtractions: z.number().min(0).max(50).default(0), // УЕТ за хирургию
	uetHygienePeriodontology: z.number().min(0).max(50).default(0), // УЕТ за гигиену/пародонтологию
	uetProstheticsOrthodontics: z.number().min(0).max(50).default(0), // УЕТ за ортопедию/ортодонтию
	uetAnesthesia: z.number().min(0).max(20).default(0), // УЕТ за анестезию
	totalUetForVisit: z.number().min(0).max(100), // Итого УЕТ за визит
});
export type DailyPatientRecord037u = z.infer<typeof dailyPatientRecord037uSchema>;

/** Сводные итоги за рабочий день / смену (подвал формы 037/у) */
export const dailySummaryTotals037uSchema = z.object({
	totalPatientsCount: z.number().int().min(0),
	totalAdultsCount: z.number().int().min(0),
	totalChildrenUnder14Count: z.number().int().min(0),
	totalAdolescents15_17Count: z.number().int().min(0),
	totalPrimaryVisitsCount: z.number().int().min(0),
	totalRepeatVisitsCount: z.number().int().min(0),
	totalSanatedCount: z.number().int().min(0),
	totalUetAccumulated: z.number().min(0),
	shiftStandardQuotaUet: z.number().min(0).default(21.0), // Норма УЕТ за смену 6.6 ч (21.0 УЕТ)
	planExecutionPercentage: z.number().min(0).default(100.0),
});
export type DailySummaryTotals037u = z.infer<typeof dailySummaryTotals037uSchema>;

/** Калькулятор сводных показателей дня для формы 037/у */
export function calculateDaily037uTotals(
	records: readonly DailyPatientRecord037u[],
	standardShiftQuota = 21.0,
): DailySummaryTotals037u {
	let adults = 0;
	let children = 0;
	let adolescents = 0;
	let primary = 0;
	let repeat = 0;
	let sanated = 0;
	let totalUet = 0;

	for (const r of records) {
		if (r.patientCategory === "adult") adults += 1;
		else if (r.patientCategory === "child_under_14") children += 1;
		else adolescents += 1;

		if (r.isPrimaryVisit) primary += 1;
		else repeat += 1;

		if (r.isSanatedInVisit) sanated += 1;

		totalUet += r.totalUetForVisit;
	}

	const totalPatients = records.length;
	const roundedUet = Number(totalUet.toFixed(2));
	const execPct =
		standardShiftQuota > 0 ? Number(((roundedUet / standardShiftQuota) * 100).toFixed(1)) : 100.0;

	return {
		totalPatientsCount: totalPatients,
		totalAdultsCount: adults,
		totalChildrenUnder14Count: children,
		totalAdolescents15_17Count: adolescents,
		totalPrimaryVisitsCount: primary,
		totalRepeatVisitsCount: repeat,
		totalSanatedCount: sanated,
		totalUetAccumulated: roundedUet,
		shiftStandardQuotaUet: standardShiftQuota,
		planExecutionPercentage: execPct,
	};
}

/** Полный структурированный Payload формы № 037/у-88 */
export const dailyDentistDiary037uPayloadSchema = z.object({
	formNumber: z.literal("037/у-88"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicDepartment: z.string().trim().max(120).default("Стоматологическое отделение"),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
	shiftDate: z.string().trim().min(10).max(32),
	shiftNumber: z.enum(["shift_1_morning", "shift_2_evening", "full_day"]).default("shift_1_morning"),
	shiftWorkingHours: z.string().trim().max(32).default("08:00 - 14:36 (6.6 ч)"),
	patientRecords: z.array(dailyPatientRecord037uSchema).default([]),
	summaryTotals: dailySummaryTotals037uSchema.default({
		totalPatientsCount: 0,
		totalAdultsCount: 0,
		totalChildrenUnder14Count: 0,
		totalAdolescents15_17Count: 0,
		totalPrimaryVisitsCount: 0,
		totalRepeatVisitsCount: 0,
		totalSanatedCount: 0,
		totalUetAccumulated: 0,
		shiftStandardQuotaUet: 21.0,
		planExecutionPercentage: 0,
	}),
	notesAndObservations: z.string().trim().max(1000).nullable().optional(),
});
export type DailyDentistDiary037uPayload = z.infer<typeof dailyDentistDiary037uPayloadSchema>;
