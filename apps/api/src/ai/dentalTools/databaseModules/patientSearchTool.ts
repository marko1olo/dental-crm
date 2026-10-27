/**
 * patientSearchTool.ts — Быстрый поиск пациентов в базе данных клиники.
 * Мандаты: 8b (<= 120 строк), 8n (соло-практика), 8x (живой клинический язык).
 */

import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { patients } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const patientSearchSchema = z.object({
	query: z.string().min(1, "Поисковый запрос обязателен").describe("ФИО, номер телефона или номер карты пациента"),
	limit: z.number().int().min(1).max(50).default(10).describe("Максимальное количество возвращаемых записей"),
});

export type PatientSearchInput = z.infer<typeof patientSearchSchema>;

export interface PatientSearchResult {
	readonly found: boolean;
	readonly query: string;
	readonly totalCount: number;
	readonly patients: readonly {
		readonly id: string;
		readonly fullName: string;
		readonly phone: string | null;
		readonly birthDate: string | null;
		readonly notes: string | null;
	}[];
}

export async function handlePatientSearch(args: PatientSearchInput, context: DentalToolContext): Promise<PatientSearchResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const searchPattern = `%${args.query.trim()}%`;
	const limit = args.limit ?? 10;

	const rows = await activeDb
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			birthDate: patients.birthDate,
			notes: patients.notes,
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				or(ilike(patients.fullName, searchPattern), ilike(patients.phone, searchPattern)),
			),
		)
		.limit(limit);

	return {
		found: rows.length > 0,
		query: args.query,
		totalCount: rows.length,
		patients: rows.map((p) => ({
			id: p.id,
			fullName: p.fullName,
			phone: p.phone,
			birthDate: p.birthDate,
			notes: p.notes,
		})),
	};
}

export const patientSearchTool: DentalToolEntry<typeof patientSearchSchema> = {
	name: "patient_search",
	description: "Поиск пациентов в базе данных клиники по ФИО или номеру телефона с учетом тенантной изоляции.",
	schema: patientSearchSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("patient_search", "Поиск пациентов по имени, телефону или номеру карты.", patientSearchSchema),
	handler: handlePatientSearch,
};
