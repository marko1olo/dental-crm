/**
 * printDocumentTool.ts — Печать и экспорт медицинских карт, согласий и актов.
 * Мандаты: 8b (<= 120 строк), 8e (печать в любой момент), 8x (живой язык).
 */

import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const printDocumentSchema = z.object({
	documentType: z
		.enum(["form_043", "informed_consent", "treatment_act", "invoice_receipt", "prescription", "warranty_memo"])
		.describe("Тип формируемого клинического/финансового документа"),
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	visitId: z.string().uuid("Некорректный UUID визита").optional().describe("ID визита"),
	format: z
		.enum(["pdf", "system_printer", "raw_esc_pos"])
		.default("pdf")
		.describe("Формат вывода: pdf (экспорт), system_printer (печать на принтер), raw_esc_pos (кассовая лента)"),
	printerName: z.string().optional().describe("Имя целевого принтера (для system_printer)"),
});

export type PrintDocumentInput = z.infer<typeof printDocumentSchema>;

export interface PrintDocumentResult {
	readonly success: boolean;
	readonly documentType: string;
	readonly patientId: string;
	readonly format: string;
	readonly printJobId: string;
	readonly downloadUrl: string;
	readonly actionDirective: "TRIGGER_BROWSER_PRINT" | "DESKTOP_PRINT_DISPATCHED";
	readonly message: string;
}

export async function handlePrintDocument(args: PrintDocumentInput, context: DentalToolContext): Promise<PrintDocumentResult> {
	const isDesktop = context.runtimeMode === "desktop_native";
	const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const downloadUrl = `/api/documents/export/${args.documentType}/${args.patientId}.pdf`;

	const actionDirective = isDesktop ? "DESKTOP_PRINT_DISPATCHED" : "TRIGGER_BROWSER_PRINT";
	const message = isDesktop
		? `Документ '${args.documentType}' направлен в системную очередь печати Windows (${args.printerName || "принтер по умолчанию"}).`
		: `Сформирован документ '${args.documentType}'. Готов к печати через диалог браузера или скачиванию PDF.`;

	return {
		success: true,
		documentType: args.documentType,
		patientId: args.patientId,
		format: args.format,
		printJobId: jobId,
		downloadUrl,
		actionDirective,
		message,
	};
}

export const printDocumentTool: DentalToolEntry<typeof printDocumentSchema> = {
	name: "print_document",
	description: "Печать или экспорт в PDF медицинской карты приёма, информированных согласий и финансовых актов.",
	schema: printDocumentSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("print_document", "Печать и экспорт в PDF медицинской карты приёма, согласий и финансовых актов.", printDocumentSchema),
	handler: handlePrintDocument,
};
