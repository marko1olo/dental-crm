/**
 * treatmentRecordTool.ts — Фиксация выполненных процедур и манипуляций в медицинской карте приёма.
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача и 2-фазный Guard), 8x (живой клинический язык).
 */

import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { treatmentItems } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { rubToKopecks } from "./dbTypes.js";

export const treatmentRecordSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID текущего визита"),
	title: z.string().min(1, "Название процедуры обязательно").describe("Наименование выполненной манипуляции"),
	toothCode: z.string().optional().describe("Номер зуба (FDI)"),
	priceRub: z.number().min(0).default(0).describe("Стоимость манипуляции в рублях"),
	quantity: z.number().min(1).default(1).describe("Количество"),
	notes: z.string().optional().describe("Клинические примечания к манипуляции"),
	confirmed: z.boolean().optional().default(true).describe("Флаг подтверждения фиксации записи (2-фазный Guard)"),
});

export type TreatmentRecordInput = z.infer<typeof treatmentRecordSchema>;

export interface TreatmentRecordResult {
	readonly success: boolean;
	readonly recordId: string;
	readonly patientId: string;
	readonly title: string;
	readonly toothCode: string | null;
	readonly totalPriceRub: number;
	readonly amountKopecks: number;
	readonly status: string;
	readonly message: string;
}

export async function handleTreatmentRecord(args: TreatmentRecordInput, context: DentalToolContext): Promise<TreatmentRecordResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const qty = args.quantity ?? 1;
	const totalPrice = args.priceRub * qty;
	const kopecks = rubToKopecks(totalPrice);

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			recordId: "",
			patientId: args.patientId,
			title: args.title,
			toothCode: args.toothCode ?? null,
			totalPriceRub: totalPrice,
			amountKopecks: Number(kopecks),
			status: "confirmation_required",
			message: `Требуется подтверждение фиксации процедуры '${args.title}' в карте пациента.`,
		};
	}

	const [inserted] = await activeDb
		.insert(treatmentItems)
		.values({
			organizationId: orgId,
			patientId: args.patientId,
			visitId: args.visitId ?? null,
			title: args.title,
			toothCode: args.toothCode ?? null,
			quantity: String(qty),
			priceRub: totalPrice,
			unitPriceRub: args.priceRub,
			discountRub: 0,
			status: "completed",
		})
		.returning({ id: treatmentItems.id });

	return {
		success: true,
		recordId: inserted.id,
		patientId: args.patientId,
		title: args.title,
		toothCode: args.toothCode ?? null,
		totalPriceRub: totalPrice,
		amountKopecks: Number(kopecks),
		status: "completed",
		message: `Процедура '${args.title}' успешно зафиксирована в медицинской карте приёма.`,
	};
}

export const treatmentRecordTool: DentalToolEntry<typeof treatmentRecordSchema> = {
	name: "record_treatment",
	description: "Внесение выполненной манипуляции или стоматологической процедуры в карту приёма пациента.",
	schema: treatmentRecordSchema,
	destructive: true,
	titleRu: "Внесение выполненной процедуры в карту",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("record_treatment", "Фиксация выполненной процедуры в карте приёма.", treatmentRecordSchema),
	handler: handleTreatmentRecord,
};
