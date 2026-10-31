/**
 * apps/api/src/services/import/streaming/pricelistImportStream.ts
 *
 * Real Streaming & Batch Data Importer for Service Pricelists.
 * Mandates:
 * - Mandate 8z / 8wy: Zero Mocks — 100% real PostgreSQL transactions via Drizzle ORM.
 * - Mandate 8n: Solo Doctor & Scale Sovereignty — fast frictionless import from CSV/Excel.
 * - Mandate 8d: Strict tenant isolation by organizationId.
 * - Anti-Reality-Simulator: No fake setTimeout timers, immediate streaming/batch execution.
 */

import type { DentalSpecialty, ServiceCategory } from "@dental/shared";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { auditEvents, serviceCatalogItems } from "../../../db/schema.js";
import {
	parseDelimitedTextToMatrix,
	parseSpreadsheetBufferToMatrix,
} from "./spreadsheetMatrixParser.js";

export const PRICELIST_HEADER_MAP: Record<
	string,
	"code" | "title" | "category" | "price" | "duration"
> = {
	код: "code",
	артикул: "code",
	номер: "code",
	code: "code",
	sku: "code",
	id: "code",
	наименование: "title",
	название: "title",
	услуга: "title",
	процедура: "title",
	манипуляция: "title",
	title: "title",
	name: "title",
	service: "title",
	раздел: "category",
	категория: "category",
	группа: "category",
	специальность: "category",
	category: "category",
	section: "category",
	цена: "price",
	стоимость: "price",
	руб: "price",
	рубли: "price",
	price: "price",
	cost: "price",
	длительность: "duration",
	время: "duration",
	минут: "duration",
	duration: "duration",
	minutes: "duration",
};

export interface PricelistImportResultItem {
	rowNumber: number;
	code: string;
	title: string;
	category: ServiceCategory;
	priceRub: number;
	durationMinutes: number;
	status: "ready" | "warning" | "blocked";
	warning?: string;
}

export interface PricelistImportExecutionResult {
	sourceName: string;
	totalRows: number;
	readyRows: number;
	warningRows: number;
	blockedRows: number;
	importedCount: number;
	skippedCount: number;
	importedItemIds: string[];
	items: PricelistImportResultItem[];
}

export function normalizePricelistCategory(raw: string): ServiceCategory {
	const c = raw.toLowerCase().trim();
	if (c.includes("пародонт")) return "periodontology";
	if (
		c.includes("терап") ||
		c.includes("кариес") ||
		c.includes("пломб") ||
		c.includes("эндо")
	)
		return "therapy";
	if (c.includes("хирург") || c.includes("удал") || c.includes("имплант"))
		return "surgery";
	if (
		c.includes("ортопед") ||
		c.includes("корон") ||
		c.includes("протез") ||
		c.includes("винир")
	)
		return "prosthetics";
	if (c.includes("ортодонт") || c.includes("брекет") || c.includes("элайн"))
		return "orthodontics";
	if (
		c.includes("гигиен") ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел")
	)
		return "hygiene";
	if (
		c.includes("диагност") ||
		c.includes("снимок") ||
		c.includes("рентген") ||
		c.includes("кт")
	)
		return "imaging";
	if (c.includes("консульт") || c.includes("осмотр")) return "consultation";
	return "other";
}

export function parsePriceNumber(raw: string): number {
	const cleaned = raw
		.replace(/\s+/g, "")
		.replace(",", ".")
		.replace(/[^\d.]/g, "");
	const num = parseFloat(cleaned);
	return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
}

export function parseDurationNumber(raw: string): number {
	const lower = raw.toLowerCase().trim();
	if (lower.includes("час") || lower.includes("hour")) {
		const hours = parseFloat(lower.replace(/[^\d.]/g, "")) || 1;
		return Math.round(hours * 60);
	}
	const cleaned = raw.replace(/\D/g, "");
	const num = parseInt(cleaned, 10);
	return Number.isFinite(num) && num > 0 ? Math.min(Math.max(num, 5), 480) : 30;
}

export async function importPricelistStream(params: {
	organizationId: string;
	bufferOrText: Buffer | string;
	filename: string;
	commit?: boolean;
}): Promise<PricelistImportExecutionResult> {
	const { organizationId, bufferOrText, filename, commit = false } = params;

	let matrix: string[][];
	if (Buffer.isBuffer(bufferOrText)) {
		matrix = parseSpreadsheetBufferToMatrix(bufferOrText, filename).rows;
	} else {
		matrix = parseDelimitedTextToMatrix(bufferOrText);
	}

	if (matrix.length === 0) {
		return {
			sourceName: filename,
			totalRows: 0,
			readyRows: 0,
			warningRows: 0,
			blockedRows: 0,
			importedCount: 0,
			skippedCount: 0,
			importedItemIds: [],
			items: [],
		};
	}

	// 1. Column header discovery
	const headerRow = matrix[0] ?? [];
	const fieldColMap: Record<string, number> = {};
	headerRow.forEach((col, idx) => {
		const clean = col.toLowerCase().trim().replace(/[\s_-]+/g, " ");
		const matchedField = PRICELIST_HEADER_MAP[clean];
		if (matchedField && fieldColMap[matchedField] === undefined) {
			fieldColMap[matchedField] = idx;
		}
	});

	const hasRecognizedHeader = Object.keys(fieldColMap).length > 0;
	const codeIdx = hasRecognizedHeader ? (fieldColMap.code ?? 0) : 0;
	const titleIdx = hasRecognizedHeader ? (fieldColMap.title ?? 1) : 1;
	const categoryIdx = hasRecognizedHeader ? (fieldColMap.category ?? 2) : 2;
	const priceIdx = hasRecognizedHeader ? (fieldColMap.price ?? 3) : 3;
	const durationIdx = hasRecognizedHeader ? (fieldColMap.duration ?? 4) : 4;

	const dataRows = hasRecognizedHeader ? matrix.slice(1) : matrix;

	// 2. Fetch existing codes for tenant
	const existingItems = await db
		.select({ code: serviceCatalogItems.code })
		.from(serviceCatalogItems)
		.where(eq(serviceCatalogItems.organizationId, organizationId));

	const existingCodes = new Set(
		existingItems.map((it) => it.code.trim().toUpperCase()),
	);

	const items: PricelistImportResultItem[] = [];
	const toInsertPayloads: Array<{
		organizationId: string;
		code: string;
		title: string;
		category: ServiceCategory;
		specialty: DentalSpecialty;
		basePriceRub: number;
		priceRub: number;
		durationMinutes: number;
		taxDeductible: boolean;
		isActive: boolean;
	}> = [];

	for (let i = 0; i < dataRows.length; i++) {
		const row = dataRows[i] ?? [];
		let rawCode = (row[codeIdx] ?? "").trim();
		const rawTitle = (row[titleIdx] ?? "").trim();
		const rawCategory = (row[categoryIdx] ?? "").trim();
		const rawPrice = (row[priceIdx] ?? "").trim();
		const rawDuration = (row[durationIdx] ?? "").trim();

		const rowNumber = i + (hasRecognizedHeader ? 2 : 1);

		if (!rawTitle) {
			items.push({
				rowNumber,
				code: rawCode || `ROW-${rowNumber}`,
				title: "Не указано",
				category: "other",
				priceRub: 0,
				durationMinutes: 30,
				status: "blocked",
				warning: "Отсутствует наименование услуги",
			});
			continue;
		}

		if (!rawCode) {
			rawCode = `SRV-${String(rowNumber).padStart(4, "0")}`;
		}

		const category = normalizePricelistCategory(rawCategory);
		const priceRub = parsePriceNumber(rawPrice);
		const durationMinutes = parseDurationNumber(rawDuration);

		const isCodeDuplicate = existingCodes.has(rawCode.toUpperCase());
		if (isCodeDuplicate) {
			// Auto-resolve code conflict by appending row suffix
			rawCode = `${rawCode}-${rowNumber}`;
		}

		items.push({
			rowNumber,
			code: rawCode,
			title: rawTitle,
			category,
			priceRub,
			durationMinutes,
			status: "ready",
		});

		toInsertPayloads.push({
			organizationId,
			code: rawCode,
			title: rawTitle,
			category,
			specialty: "universal",
			basePriceRub: priceRub,
			priceRub: priceRub,
			durationMinutes,
			taxDeductible: true,
			isActive: true,
		});

		existingCodes.add(rawCode.toUpperCase());
	}

	const importedItemIds: string[] = [];

	// 3. Execution / Commit to PostgreSQL
	if (commit && toInsertPayloads.length > 0) {
		await db.transaction(async (tx) => {
			const batchSize = 100;
			for (let b = 0; b < toInsertPayloads.length; b += batchSize) {
				const chunk = toInsertPayloads.slice(b, b + batchSize);
				const inserted = await tx
					.insert(serviceCatalogItems)
					.values(chunk)
					.returning({ id: serviceCatalogItems.id });
				importedItemIds.push(...inserted.map((it) => it.id));
			}

			// Audit batch log
			await tx.insert(auditEvents).values({
				organizationId,
				entityType: "price_list",
				entityId: organizationId,
				action: "import_committed",
				reason: `Импорт прейскуранта из ${filename}: успешно импортировано ${importedItemIds.length} позиций.`,
			});
		});
	}

	const readyRows = items.filter((it) => it.status === "ready").length;
	const warningRows = items.filter((it) => it.status === "warning").length;
	const blockedRows = items.filter((it) => it.status === "blocked").length;

	return {
		sourceName: filename,
		totalRows: items.length,
		readyRows,
		warningRows,
		blockedRows,
		importedCount: commit ? importedItemIds.length : readyRows,
		skippedCount: commit
			? items.length - importedItemIds.length
			: warningRows + blockedRows,
		importedItemIds,
		items,
	};
}
