/**
 * patientEmkTool.ts — Получение электронной медицинской карты (ЭМК), аллергий и одонтограммы.
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача), 8x (живой клинический язык).
 */

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { patientDrugAllergies, patients, toothStates, visits } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const getPatientEmrSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").optional().describe("Идентификатор пациента в CRM"),
	query: z.string().min(1).optional().describe("ФИО или номер телефона пациента для поиска (если patientId неизвестен)"),
});

export type GetPatientEmrInput = z.infer<typeof getPatientEmrSchema>;

export interface GetPatientEmrResult {
	readonly found: boolean;
	readonly message?: string;
	readonly patient?: {
		readonly id: string;
		readonly fullName: string;
		readonly birthDate: string | null;
		readonly phone: string | null;
		readonly weightKg: number | null;
		readonly notes: string | null;
	};
	readonly allergies?: readonly {
		readonly allergenGroup: string;
		readonly drugInnLatin: string | null;
		readonly severity: string;
		readonly manifestations: string;
	}[];
	readonly toothStates?: readonly {
		readonly toothNumber: number;
		readonly state: string;
		readonly surfaces: unknown;
		readonly notes: string | null;
	}[];
	readonly recentVisits?: readonly {
		readonly id: string;
		readonly status: string;
		readonly diagnosis: string | null;
		readonly createdAt: Date;
	}[];
}

export async function handleGetPatientEmr(args: GetPatientEmrInput, context: DentalToolContext): Promise<GetPatientEmrResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	if (!args.patientId && !args.query) {
		return { found: false, message: "Для поиска медицинской карты необходимо указать patientId или query (ФИО/телефон)." };
	}

	let targetPatient: typeof patients.$inferSelect | undefined;
	if (args.patientId) {
		const rows = await activeDb.select().from(patients).where(and(eq(patients.organizationId, orgId), eq(patients.id, args.patientId))).limit(1);
		targetPatient = rows[0];
	} else if (args.query) {
		const searchPattern = `%${args.query.trim()}%`;
		const rows = await activeDb.select().from(patients).where(and(eq(patients.organizationId, orgId), or(ilike(patients.fullName, searchPattern), ilike(patients.phone, searchPattern)))).limit(1);
		targetPatient = rows[0];
	}

	if (!targetPatient) {
		return { found: false, message: "Пациент не найден в базе данных организации." };
	}

	const [allergiesRows, toothRows, visitRows] = await Promise.all([
		activeDb.select().from(patientDrugAllergies).where(and(eq(patientDrugAllergies.organizationId, orgId), eq(patientDrugAllergies.patientId, targetPatient.id))),
		activeDb.select().from(toothStates).where(and(eq(toothStates.organizationId, orgId), eq(toothStates.patientId, targetPatient.id))),
		activeDb.select().from(visits).where(and(eq(visits.organizationId, orgId), eq(visits.patientId, targetPatient.id))).orderBy(desc(visits.createdAt)).limit(5),
	]);

	const weightNum = targetPatient.weightKg ? Number.parseFloat(targetPatient.weightKg) : null;
	return {
		found: true,
		patient: {
			id: targetPatient.id,
			fullName: targetPatient.fullName,
			birthDate: targetPatient.birthDate,
			phone: targetPatient.phone,
			weightKg: Number.isNaN(weightNum) ? null : weightNum,
			notes: targetPatient.notes,
		},
		allergies: allergiesRows.map((a) => ({ allergenGroup: a.allergenGroup, drugInnLatin: a.drugInnLatin, severity: a.reactionSeverity, manifestations: a.clinicalManifestations })),
		toothStates: toothRows.map((t) => ({ toothNumber: t.toothNumber, state: t.state, surfaces: t.surfaces, notes: t.notes })),
		recentVisits: visitRows.map((v) => ({ id: v.id, status: v.status, diagnosis: v.diagnosis, createdAt: v.createdAt })),
	};
}

export const getPatientEmrTool: DentalToolEntry<typeof getPatientEmrSchema> = {
	name: "get_patient_emr_and_odontogram",
	description: "Запрос реальной электронной медицинской карты (ЭМК), аллергостатуса и зубной формулы (FDI) пациента из PostgreSQL 18.",
	schema: getPatientEmrSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("get_patient_emr_and_odontogram", "Получение данных медицинской карты, аллергий и одонтограммы пациента.", getPatientEmrSchema),
	handler: handleGetPatientEmr,
};

export const patientEmkTool = getPatientEmrTool;

