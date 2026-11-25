/**
 * updateToothStatusTool.ts — Обновление клинического статуса зуба в зубной формуле (FDI 11-48 / 51-85).
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача и 2-фазный Guard подтверждения), 8x (живой клинический язык).
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { toothStateHistory, toothStates } from "../../../db/schema.js";
import { normalizeToothState } from "../../../routes/odontogram/types.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { isValidFdiToothNumber, type ToolDbClient, withToolTenantDb } from "./dbTypes.js";

export const updateToothStatusSchema = z.object({
	patientId: z.string().optional().describe("ID пациента (если опущен, берется из контекста открытой карты)"),
	toothNumber: z.number().min(11).max(85).describe("Номер зуба по формуле FDI (11-48 постоянные, 51-85 молочные)"),
	state: z
		.enum([
			"healthy", "caries", "pulpitis", "periodontitis", "filling", "crown", "implant", "extracted", "missing", "root", "mobility",
			"Healthy", "Caries", "Pulpitis", "Periodontitis", "Filled", "Crown", "Implant", "Extracted", "Missing", "Root", "Mobility",
		])
		.describe("Новый клинический статус зуба (healthy/caries/filling/crown/implant/extracted/missing/root/mobility)"),
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
	const patientId = args.patientId || context.patientId;
	if (!patientId) {
		throw new Error("MISSING_PATIENT_CONTEXT: Не указан пациент (patientId отсутствует в аргументах и контексте)");
	}

	const orgId = context.organizationId;
	const tooth = args.toothNumber;

	if (!isValidFdiToothNumber(tooth)) {
		throw new Error(`Недопустимый номер зуба ${tooth}. Разрешены постоянные зубы FDI 11-48 и молочные зубы FDI 51-85.`);
	}

	const normalizedState = normalizeToothState(args.state);

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			toothNumber: tooth,
			previousState: null,
			newState: normalizedState,
			surfaces: args.surfaces ?? null,
			recordedAt: new Date(),
			status: "confirmation_required",
			message: `Требуется подтверждение врача для фиксации статуса зуба ${tooth} ('${normalizedState}').`,
		};
	}

	const now = new Date();
	let previousState: string | null = null;
	let finalSurfaces: string[] | null = null;

	async function mutateToothInDb(tx: ToolDbClient) {
		if (!patientId) {
			throw new Error("MISSING_PATIENT_CONTEXT: Не указан пациент");
		}

		const existing = await tx
			.select()
			.from(toothStates)
			.where(and(eq(toothStates.organizationId, orgId), eq(toothStates.patientId, patientId), eq(toothStates.toothNumber, tooth)))
			.limit(1);

		const [existingTooth] = existing;
		previousState = existingTooth?.state ?? null;

		const existingSurfaces = Array.isArray(existingTooth?.surfaces)
			? (existingTooth.surfaces as string[])
			: [];

		if (existingTooth) {
			// Анатомическая изоляция MODBL: если surfaces опущены, сохраняем существующие.
			// При передаче новых — объединяем с существующими по стандарту MODBL (Мандат 27, 8ar/8as).
			finalSurfaces = args.surfaces !== undefined
				? Array.from(new Set([...existingSurfaces, ...args.surfaces]))
				: (existingTooth.surfaces as string[] | null);

			await tx
				.update(toothStates)
				.set({
					state: normalizedState,
					surfaces: finalSurfaces,
					notes: args.notes !== undefined ? args.notes : existingTooth.notes,
					updatedAt: now,
				})
				.where(eq(toothStates.id, existingTooth.id));
		} else {
			finalSurfaces = args.surfaces !== undefined ? args.surfaces : null;
			await tx.insert(toothStates).values({
				organizationId: orgId,
				patientId,
				toothNumber: tooth,
				state: normalizedState,
				surfaces: finalSurfaces,
				notes: args.notes ?? null,
				createdAt: now,
				updatedAt: now,
			});
		}

		// Аудит в историю зуба (ACID транзакция с toothStates)
		await tx.insert(toothStateHistory).values({
			organizationId: orgId,
			patientId,
			toothNumber: tooth,
			previousState,
			newState: normalizedState,
			previousSurfaces: existingTooth?.surfaces ?? null,
			newSurfaces: finalSurfaces,
			changedByUserId: context.userId ?? null,
			reason: args.notes ?? "Обновление через клинический ИИ-ассистент",
			changedAt: now,
		});
	}

	await withToolTenantDb(context, mutateToothInDb);

	return {
		success: true,
		toothNumber: tooth,
		previousState,
		newState: normalizedState,
		surfaces: finalSurfaces,
		recordedAt: now,
		status: "executed",
		message: `Статус зуба ${tooth} успешно зафиксирован: '${normalizedState}' в электронной одонтограмме.`,
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
