/**
 * createInvoiceDraftTool.ts — Формирование черновика счета/сметы по согласованным стоматологическим услугам.
 * Мандаты: 8b (<= 120 строк), 8e (свобода скидок до 100%, 2-фазный Guard), 8n (целочисленные копейки amountKopecks).
 */

import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { patientInvoices, treatmentItems } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { kopecksToRub, rubToKopecks } from "./dbTypes.js";

export const createInvoiceDraftSchema = z.object({
	patientId: z.string().optional().describe("ID пациента (если опущен, берется из контекста открытой карты)"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID визита"),
	items: z.array(z.object({
		title: z.string().describe("Наименование услуги"),
		priceKopecks: z.number().int().min(0).optional().describe("Цена единицы услуги в копейках (Мандат 8bm)"),
		priceRub: z.number().min(0).optional().describe("Цена в рублях (legacy/fallback)"),
		unitKopecks: z.number().int().min(0).optional().describe("Цена единицы услуги в копейках"),
		lineKopecks: z.number().int().min(0).optional().describe("Общая стоимость позиции в копейках"),
		quantity: z.number().min(1).default(1).describe("Количество"),
		serviceCode: z.string().optional().describe("Код услуги в прейскуранте"),
		regulatoryCode: z.string().optional().describe("Регуляторный код услуги"),
		toothCode: z.string().optional().describe("Номер зуба"),
	})).min(1, "Счет должен содержать хотя бы одну услугу").describe("Список оказанных услуг"),
	discountKopecks: z.number().int().min(0).default(0).optional().describe("Скидка врача в копейках (Мандат 8bm, 8e)"),
	discountRub: z.number().min(0).default(0).optional().describe("Скидка врача в рублях (legacy/fallback)"),
	confirmed: z.boolean().optional().default(true).describe("Флаг подтверждения сметы (2-фазный Guard)"),
});

export type CreateInvoiceDraftInput = z.infer<typeof createInvoiceDraftSchema>;

export interface CreateInvoiceDraftResult {
	readonly success: boolean;
	readonly invoiceId: string;
	readonly patientId: string;
	readonly itemsCount: number;
	readonly subtotalRub: number;
	readonly discountRub: number;
	readonly totalAmountRub: number;
	readonly amountKopecks: number;
	readonly subtotalKopecks: number;
	readonly discountKopecks: number;
	readonly status: string;
	readonly message: string;
}

export async function handleCreateInvoiceDraft(args: CreateInvoiceDraftInput, context: DentalToolContext): Promise<CreateInvoiceDraftResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const patientId = args.patientId || context.patientId;
	if (!patientId) {
		throw new Error("MISSING_PATIENT_CONTEXT: Не указан пациент (patientId отсутствует в аргументах и контексте)");
	}

	let subtotalKopecks = 0n;
	const processedItems = args.items.map((item) => {
		const qty = BigInt(Math.max(1, Math.round(item.quantity ?? 1)));
		const unitKopecks = item.priceKopecks !== undefined
			? BigInt(item.priceKopecks)
			: item.unitKopecks !== undefined
			? BigInt(item.unitKopecks)
			: BigInt(Math.round((item.priceRub ?? 0) * 100));
		const lineKopecks = item.lineKopecks !== undefined
			? BigInt(item.lineKopecks)
			: unitKopecks * qty;
		subtotalKopecks += lineKopecks;
		return {
			...item,
			qtyNumber: Number(qty),
			unitKopecks,
			lineKopecks,
			unitPriceKopecks: Number(unitKopecks),
			priceKopecks: Number(lineKopecks),
		};
	});

	const discountKopecks = args.discountKopecks !== undefined && args.discountKopecks > 0
		? BigInt(args.discountKopecks)
		: BigInt(Math.round((args.discountRub ?? 0) * 100));
	const totalKopecks = subtotalKopecks > discountKopecks ? subtotalKopecks - discountKopecks : 0n;

	const subtotalRub = kopecksToRub(subtotalKopecks);
	const discountRub = kopecksToRub(discountKopecks);
	const totalAmountRub = kopecksToRub(totalKopecks);

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			invoiceId: "",
			patientId,
			itemsCount: args.items.length,
			subtotalRub,
			discountRub,
			totalAmountRub,
			amountKopecks: Number(totalKopecks),
			subtotalKopecks: Number(subtotalKopecks),
			discountKopecks: Number(discountKopecks),
			status: "confirmation_required",
			message: `Требуется подтверждение выставления счёта на сумму ${totalAmountRub.toLocaleString("ru-RU")} ₽.`,
		};
	}

	const insertedId = await activeDb.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(patientInvoices)
			.values({
				organizationId: orgId,
				patientId,
				visitId: args.visitId ?? null,
				totalRub: String(totalAmountRub),
				totalAmountRub,
				status: "pending",
			})
			.returning({ id: patientInvoices.id });

		if (!inserted) {
			throw new Error("Не удалось создать счет");
		}

		for (const item of processedItems) {
			await tx.insert(treatmentItems).values({
				organizationId: orgId,
				patientId,
				visitId: args.visitId ?? null,
				invoiceId: inserted.id,
				title: item.title,
				toothCode: item.toothCode ?? null,
				quantity: String(item.qtyNumber),
				priceRub: kopecksToRub(item.lineKopecks),
				unitPriceRub: kopecksToRub(item.unitKopecks),
				discountRub: 0,
				status: "completed",
			});
		}

		return inserted.id;
	});

	return {
		success: true,
		invoiceId: insertedId,
		patientId,
		itemsCount: args.items.length,
		subtotalRub,
		discountRub,
		totalAmountRub,
		amountKopecks: Number(totalKopecks),
		subtotalKopecks: Number(subtotalKopecks),
		discountKopecks: Number(discountKopecks),
		status: "draft_in_cashier",
		message: `Счёт на сумму ${totalAmountRub.toLocaleString("ru-RU")} ₽ успешно создан и направлен в кассу клиники.`,
	};
}

export const createInvoiceDraftTool: DentalToolEntry<typeof createInvoiceDraftSchema> = {
	name: "create_invoice_draft",
	description: "Формирование черновика счета/сметы по согласованным услугам для передачи в кассу клиники.",
	schema: createInvoiceDraftSchema,
	destructive: true,
	titleRu: "Формирование счёта на оплату",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("create_invoice_draft", "Создание счёта в кассу по перечню оказанных стоматологических услуг.", createInvoiceDraftSchema),
	handler: handleCreateInvoiceDraft,
};
