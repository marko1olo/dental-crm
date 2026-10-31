/**
 * apps/api/src/services/import/streaming/patientImportStream.ts
 *
 * Real Streaming & Batch Data Importer for Patients.
 * Mandates:
 * - Mandate 8z / 8wy: Zero Mocks — 100% real PostgreSQL transactions via Drizzle ORM.
 * - Mandate 8n: Solo Doctor & Scale Sovereignty — fast frictionless import from CSV/Excel.
 * - Mandate 8d: Strict tenant isolation by organizationId.
 * - Anti-Reality-Simulator: No fake setTimeout timers, immediate streaming/batch execution.
 */

import { normalizeDate, normalizePhone } from "@dental/shared";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { auditEvents, importBatches, patients } from "../../../db/schema.js";
import {
	parseDelimitedTextToMatrix,
	parseSpreadsheetBufferToMatrix,
} from "./spreadsheetMatrixParser.js";

export const PATIENT_HEADER_MAP: Record<
	string,
	"fullName" | "phone" | "birthDate" | "notes"
> = {
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
				const inserted = await tx
					.insert(patients)
					.values(chunk)
					.returning({ id: patients.id });
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
		skippedCount: commit
			? items.length - importedPatientIds.length
			: warningRows + blockedRows,
		importedPatientIds,
		items,
	};
}
