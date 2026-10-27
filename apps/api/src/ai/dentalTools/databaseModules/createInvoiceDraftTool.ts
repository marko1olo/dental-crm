/**
 * createInvoiceDraftTool.ts — Формирование черновика счета/сметы по согласованным стоматологическим услугам.
 * Мандаты: 8b (<= 120 строк), 8e (свобода скидок до 100%, 2-фазный Guard), 8n (целочисленные копейки amountKopecks).
 */

import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { patientInvoices, treatmentItems } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { rubToKopecks } from "./dbTypes.js";

export const createInvoiceDraftSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID завершенного визита"),
	items: z.array(z.object({
		title: z.string().describe("Наименование услуги"),
		priceRub: z.number().min(0).describe("Цена в рублях"),
		quantity: z.number().min(1).default(1).describe("Количество"),
		code804n: z.string().optional().describe("Код в прейскуранте"),
		toothCode: z.string().optional().describe("Номер зуба"),
	})).min(1, "Счет должен содержать хотя бы одну услугу").describe("Список оказанных услуг"),
	discountRub: z.number().min(0).default(0).describe("Скидка врача в рублях (Мандат 8e: свобода скидок вплоть до 100%)"),
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
	readonly amountKopecks?: number;
	readonly status: string;
	readonly message: string;
}

export async function handleCreateInvoiceDraft(args: CreateInvoiceDraftInput, context: DentalToolContext): Promise<CreateInvoiceDraftResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;

	let subtotal = 0;
	for (const item of args.items) {
		subtotal += item.priceRub * (item.quantity ?? 1);
	}

	const discount = args.discountRub ?? 0;
	const total = Math.max(0, subtotal - discount);
	const totalKopecks = rubToKopecks(total);

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			invoiceId: "",
			patientId: args.patientId,
			itemsCount: args.items.length,
			subtotalRub: subtotal,
			discountRub: discount,
			totalAmountRub: total,
			amountKopecks: Number(totalKopecks),
			status: "confirmation_required",
			message: `Требуется подтверждение выставления счёта на сумму ${total.toLocaleString("ru-RU")} ₽.`,
		};
	}

	const [inserted] = await activeDb
		.insert(patientInvoices)
		.values({ organizationId: orgId, patientId: args.patientId, visitId: args.visitId ?? null, totalAmountRub: total, discountAmountRub: discount, paidAmountRub: 0, status: "pending" })
		.returning({ id: patientInvoices.id });

	for (const item of args.items) {
		await activeDb.insert(treatmentItems).values({
			organizationId: orgId,
			patientId: args.patientId,
			visitId: args.visitId ?? null,
			title: item.title,
			toothCode: item.toothCode ?? null,
			quantity: String(item.quantity ?? 1),
			priceRub: item.priceRub * (item.quantity ?? 1),
			unitPriceRub: item.priceRub,
			discountRub: 0,
			status: "completed",
		});
	}

	return {
		success: true,
		invoiceId: inserted.id,
		patientId: args.patientId,
		itemsCount: args.items.length,
		subtotalRub: subtotal,
		discountRub: discount,
		totalAmountRub: total,
		amountKopecks: Number(totalKopecks),
		status: "draft_in_cashier",
		message: `Счёт на сумму ${total.toLocaleString("ru-RU")} ₽ успешно создан и направлен на кассу клиники (готовность к 54-ФЗ).`,
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
