/**
 * updateToothStatusTool.ts — Обновление клинического статуса зуба в зубной формуле (FDI 11-48 / 51-85).
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача и 2-фазный Guard подтверждения), 8x (живой клинический язык).
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { toothStateHistory, toothStates } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { isValidFdiToothNumber } from "./dbTypes.js";

export const updateToothStatusSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	toothNumber: z.number().min(11).max(85).describe("Номер зуба по формуле FDI (11-48 постоянные, 51-85 молочные)"),
	state: z
		.enum(["healthy", "caries", "pulpitis", "periodontitis", "filling", "crown", "implant", "extracted", "missing", "root", "mobility"])
		.describe("Новый клинический статус зуба"),
	surfaces: z.array(z.string()).optional().describe("Пораженные или восстановленные поверхности зуба (O, M, D, V, L)"),
	notes: z.string().optional().describe("Клинические примечания к состоянию зуба"),
	confirmed: z.boolean().optional().default(true).describe("Флаг подтверждения врачом/оператором (2-фазный барьер Guard)"),
});

export type UpdateToothStatusInput = z.infer<typeof updateToothStatusSchema>;

export interface UpdateToothStatusResult {
	readonly success: boolean;
	readonly toothNumber: number;
	readonly previousState: string | null;
	readonly newState: string;
	readonly surfaces: readonly string[] | null;
	readonly recordedAt: Date;
	readonly status?: string;
	readonly message: string;
}

export async function handleUpdateToothStatus(args: UpdateToothStatusInput, context: DentalToolContext): Promise<UpdateToothStatusResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const tooth = args.toothNumber;

	if (!isValidFdiToothNumber(tooth)) {
		throw new Error(`Недопустимый номер зуба ${tooth}. Разрешены постоянные зубы FDI 11-48 и молочные зубы FDI 51-85.`);
	}

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			toothNumber: tooth,
			previousState: null,
			newState: args.state,
			surfaces: args.surfaces ?? null,
			recordedAt: new Date(),
			status: "confirmation_required",
			message: `Требуется подтверждение врача для фиксации статуса зуба ${tooth} ('${args.state}').`,
		};
	}

	const existing = await activeDb
		.select()
		.from(toothStates)
		.where(and(eq(toothStates.organizationId, orgId), eq(toothStates.patientId, args.patientId), eq(toothStates.toothNumber, tooth)))
		.limit(1);

	const previousState = existing[0]?.state ?? null;
	const now = new Date();

	if (existing.length > 0) {
		await activeDb
			.update(toothStates)
			.set({ state: args.state, surfaces: args.surfaces ?? null, notes: args.notes ?? null, updatedAt: now })
			.where(eq(toothStates.id, existing[0].id));
	} else {
		await activeDb.insert(toothStates).values({
			organizationId: orgId, patientId: args.patientId, toothNumber: tooth, state: args.state, surfaces: args.surfaces ?? null, notes: args.notes ?? null, createdAt: now, updatedAt: now,
		});
	}

	// Аудит в историю зуба
	await activeDb.insert(toothStateHistory).values({
		organizationId: orgId, patientId: args.patientId, toothNumber: tooth, previousState, newState: args.state, previousSurfaces: existing[0]?.surfaces ?? null, newSurfaces: args.surfaces ?? null, changedByUserId: context.userId ?? null, reason: args.notes ?? "Обновление через клинический ИИ-ассистент", changedAt: now,
	});

	return {
		success: true,
		toothNumber: tooth,
		previousState,
		newState: args.state,
		surfaces: args.surfaces ?? null,
		recordedAt: now,
		status: "executed",
		message: `Статус зуба ${tooth} успешно зафиксирован: '${args.state}' в электронной одонтограмме.`,
	};
}

export const updateToothStatusTool: DentalToolEntry<typeof updateToothStatusSchema> = {
	name: "update_tooth_status",
	description: "Обновление клинического статуса зуба в зубной формуле (FDI 11-48 / 51-85) с записью в PostgreSQL 18 и историей.",
	schema: updateToothStatusSchema,
	destructive: true,
	titleRu: "Обновление статуса зуба в одонтограмме",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("update_tooth_status", "Обновление клинического статуса зуба в одонтограмме пациента.", updateToothStatusSchema),
	handler: handleUpdateToothStatus,
};
