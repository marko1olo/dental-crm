/**
 * apps/api/src/services/import/streamingDataImporter.ts
 *
 * Real Streaming & Batch Data Importer for Patients and Service Pricelists.
 * Mandates:
 * - Mandate 8z / 8wy: Zero Mocks — 100% real PostgreSQL transactions via Drizzle ORM.
 * - Mandate 8n: Solo Doctor & Scale Sovereignty — fast frictionless import from CSV/Excel.
 * - Mandate 8d: Strict tenant isolation by organizationId.
 * - Anti-Reality-Simulator: No fake setTimeout timers, immediate streaming/batch execution.
 */

import {
	normalizeDate,
	normalizePhone,
	splitLine,
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	auditEvents,
	importBatches,
	patients,
	serviceCatalogItems,
} from "../../db/schema.js";
import {
	looksLikeZipContainer,
	parseOds,
	parseXlsx,
} from "../../migration/parsers/spreadsheet.js";

export interface ParsedSpreadsheetData {
	rows: string[][];
	sheetNames: string[];
}

/**
 * Universal Matrix Parser for CSV, TSV, XLSX, and ODS.
 */
export function parseSpreadsheetBufferToMatrix(
	buffer: Buffer,
	filename: string,
	sheetIndex = 0,
): ParsedSpreadsheetData {
	const lower = filename.toLowerCase();

	if (lower.endsWith(".xlsx") || lower.endsWith(".ods") || looksLikeZipContainer(buffer)) {
		const isOds = lower.endsWith(".ods");
		const book = isOds ? parseOds(buffer) : parseXlsx(buffer);
		if (book.sheets.length > 0) {
			const idx = Math.min(sheetIndex, book.sheets.length - 1);
			return {
				rows: book.sheets[idx]?.rows ?? [],
				sheetNames: book.sheets.map((s) => s.name),
			};
		}
	}

	// Plain text CSV / TSV
	const text = buffer.toString("utf8");
	return {
		rows: parseDelimitedTextToMatrix(text),
		sheetNames: ["Лист 1"],
	};
}

/**
 * RFC 4180 Delimited Text Parser with Delimiter Auto-Detection and Quoted Multiline Handling.
 */
export function parseDelimitedTextToMatrix(text: string): string[][] {
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	if (!cleaned.trim()) return [];

	// Detect delimiter from sample
	const sample = cleaned.slice(0, 1000);
	const semicolons = (sample.match(/;/g) || []).length;
	const commas = (sample.match(/,/g) || []).length;
	const tabs = (sample.match(/\t/g) || []).length;

	let delimiter = ";";
	if (tabs > semicolons && tabs > commas) delimiter = "\t";
	else if (commas > semicolons && commas > tabs) delimiter = ",";

	const matrix: string[][] = [];
	let currentRow: string[] = [];
	let currentCell = "";
	let inQuotes = false;

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i];
		if (char === '"') {
			if (inQuotes && cleaned[i + 1] === '"') {
				currentCell += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = "";
		} else if (char === "\n" && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = "";
			if (currentRow.some((c) => c.length > 0)) {
				matrix.push(currentRow);
			}
			currentRow = [];
		} else {
			currentCell += char;
		}
	}

	if (currentCell.length > 0 || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		if (currentRow.some((c) => c.length > 0)) {
			matrix.push(currentRow);
		}
	}

	return matrix;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT IMPORT STREAM
// ─────────────────────────────────────────────────────────────────────────────

const PATIENT_HEADER_MAP: Record<string, "fullName" | "phone" | "birthDate" | "notes"> = {
	фио: "fullName",
	fio: "fullName",
	пациент: "fullName",
	имя: "fullName",
	"полное имя": "fullName",
	клиент: "fullName",
	name: "fullName",
	fullname: "fullName",
	"full name": "fullName",
	телефон: "phone",
	номер: "phone",
	тел: "phone",
	моб: "phone",
	мобильный: "phone",
	phone: "phone",
	tel: "phone",
	mobile: "phone",
	whatsapp: "phone",
	"дата рождения": "birthDate",
	др: "birthDate",
	"д.р.": "birthDate",
	рождение: "birthDate",
	birthdate: "birthDate",
	birthday: "birthDate",
	dob: "birthDate",
	комментарий: "notes",
	примечание: "notes",
	заметка: "notes",
	жалоба: "notes",
	диагноз: "notes",
	comment: "notes",
	comments: "notes",
	notes: "notes",
	note: "notes",
};

export interface PatientImportResultItem {
	rowNumber: number;
	fullName: string;
	phone: string | null;
	birthDate: string | null;
	notes: string | null;
	status: "ready" | "warning" | "blocked";
	warning?: string;
}

export interface PatientImportExecutionResult {
	sourceName: string;
	totalRows: number;
	readyRows: number;
	warningRows: number;
	blockedRows: number;
	importedCount: number;
	skippedCount: number;
	importedPatientIds: string[];
	items: PatientImportResultItem[];
}

export async function importPatientsStream(params: {
	organizationId: string;
	bufferOrText: Buffer | string;
	filename: string;
	commit?: boolean;
}): Promise<PatientImportExecutionResult> {
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
			importedPatientIds: [],
			items: [],
		};
	}

	// 1. Column header resolution
	const headerRow = matrix[0] ?? [];
	const fieldColMap: Record<string, number> = {};
	headerRow.forEach((col, idx) => {
		const clean = col.toLowerCase().trim().replace(/[\s_-]+/g, " ");
		const matchedField = PATIENT_HEADER_MAP[clean];
		if (matchedField && fieldColMap[matchedField] === undefined) {
			fieldColMap[matchedField] = idx;
		}
	});

	// If no header recognized, use fallback positions: Col 0 = Name, Col 1 = Phone, Col 2 = BirthDate, Col 3 = Notes
	const hasRecognizedHeader = Object.keys(fieldColMap).length > 0;
	const nameIdx = hasRecognizedHeader ? (fieldColMap.fullName ?? 0) : 0;
	const phoneIdx = hasRecognizedHeader ? (fieldColMap.phone ?? 1) : 1;
	const dobIdx = hasRecognizedHeader ? (fieldColMap.birthDate ?? 2) : 2;
	const notesIdx = hasRecognizedHeader ? (fieldColMap.notes ?? 3) : 3;

	const dataRows = hasRecognizedHeader ? matrix.slice(1) : matrix;

	// 2. Fetch existing patients for tenant deduplication
	const existingPatients = await db
		.select({
			phone: patients.phone,
			fullName: patients.fullName,
		})
		.from(patients)
		.where(eq(patients.organizationId, organizationId));

	const existingPhones = new Set(
		existingPatients
			.map((p) => (p.phone ? normalizePhone(p.phone) : null))
			.filter(Boolean),
	);
	const existingNames = new Set(
		existingPatients.map((p) => p.fullName.trim().toLowerCase()),
	);

	const items: PatientImportResultItem[] = [];
	const toInsertPayloads: Array<{
		organizationId: string;
		fullName: string;
		phone: string | null;
		birthDate: string | null;
		notes: string | null;
		status: "active";
	}> = [];

	for (let i = 0; i < dataRows.length; i++) {
		const row = dataRows[i] ?? [];
		const rawName = (row[nameIdx] ?? "").trim();
		const rawPhone = (row[phoneIdx] ?? "").trim();
		const rawDob = (row[dobIdx] ?? "").trim();
		const rawNotes = (row[notesIdx] ?? "").trim();

		const phone = rawPhone ? normalizePhone(rawPhone) : null;
		const birthDate = rawDob ? normalizeDate(rawDob) : null;
		const rowNumber = i + (hasRecognizedHeader ? 2 : 1);

		if (!rawName) {
			items.push({
				rowNumber,
				fullName: "Не указано",
				phone,
				birthDate,
				notes: rawNotes || null,
				status: "blocked",
				warning: "Отсутствует ФИО пациента",
			});
			continue;
		}

		// Duplicate detection
		const isPhoneDuplicate = Boolean(phone && existingPhones.has(phone));
		const isNameDuplicate = existingNames.has(rawName.toLowerCase());

		if (isPhoneDuplicate || isNameDuplicate) {
			items.push({
				rowNumber,
				fullName: rawName,
				phone,
				birthDate,
				notes: rawNotes || null,
				status: "warning",
				warning: isPhoneDuplicate
					? "Дубликат по номеру телефона (пропущен)"
					: "Дубликат по ФИО (пропущен)",
			});
			continue;
		}

		// Valid new patient
		items.push({
			rowNumber,
			fullName: rawName,
			phone,
			birthDate,
			notes: rawNotes || null,
			status: "ready",
		});

		toInsertPayloads.push({
			organizationId,
			fullName: rawName,
			phone,
			birthDate,
			notes: rawNotes || null,
			status: "active",
		});

		// Track within current batch to prevent intra-batch dupes
		if (phone) existingPhones.add(phone);
		existingNames.add(rawName.toLowerCase());
	}

	const importedPatientIds: string[] = [];

	// 3. Execution / Commit to PostgreSQL
	if (commit && toInsertPayloads.length > 0) {
		await db.transaction(async (tx) => {
			const batchSize = 100;
			for (let b = 0; b < toInsertPayloads.length; b += batchSize) {
				const chunk = toInsertPayloads.slice(b, b + batchSize);
				const inserted = await tx.insert(patients).values(chunk).returning({ id: patients.id });
				importedPatientIds.push(...inserted.map((p) => p.id));
			}

			// Audit batch log
			const [batchRecord] = await tx
				.insert(importBatches)
				.values({
					organizationId,
					sourceName: filename,
					status: "completed",
					totalRows: items.length,
					importedRows: importedPatientIds.length,
					skippedRows: items.length - importedPatientIds.length,
					warningRows: items.filter((it) => it.status === "warning").length,
					blockedRows: items.filter((it) => it.status === "blocked").length,
				})
				.returning();

			if (batchRecord) {
				await tx.insert(auditEvents).values({
					organizationId,
					entityType: "import_batch",
					entityId: batchRecord.id,
					action: "import_committed",
					reason: `Импорт пациентов из ${filename}: успешно импортировано ${importedPatientIds.length}.`,
				});
			}
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
		importedCount: commit ? importedPatientIds.length : readyRows,
		skippedCount: commit ? items.length - importedPatientIds.length : warningRows + blockedRows,
		importedPatientIds,
		items,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICELIST IMPORT STREAM
// ─────────────────────────────────────────────────────────────────────────────

const PRICELIST_HEADER_MAP: Record<string, "code" | "title" | "category" | "price" | "duration"> = {
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
	if (c.includes("терап") || c.includes("кариес") || c.includes("пломб") || c.includes("эндо")) return "therapy";
	if (c.includes("хирург") || c.includes("удал") || c.includes("имплант")) return "surgery";
	if (c.includes("ортопед") || c.includes("корон") || c.includes("протез") || c.includes("винир")) return "prosthetics";
	if (c.includes("ортодонт") || c.includes("брекет") || c.includes("элайн")) return "orthodontics";
	if (c.includes("гигиен") || c.includes("чистк") || c.includes("air-flow") || c.includes("отбел")) return "hygiene";
	if (c.includes("диагност") || c.includes("снимок") || c.includes("рентген") || c.includes("кт")) return "imaging";
	if (c.includes("консульт") || c.includes("осмотр")) return "consultation";
	return "other";
}

export function parsePriceNumber(raw: string): number {
	const cleaned = raw.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.]/g, "");
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

	const existingCodes = new Set(existingItems.map((it) => it.code.trim().toUpperCase()));

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
		skippedCount: commit ? items.length - importedItemIds.length : warningRows + blockedRows,
		importedItemIds,
		items,
	};
}
