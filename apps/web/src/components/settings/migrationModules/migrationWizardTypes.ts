/**
 * apps/web/src/components/settings/migrationModules/migrationWizardTypes.ts
 *
 * Types and pure utilities for MigrationWizard:
 * - Column mappings (fullName, phone, birthDate, balance, lastVisitDate, notes)
 * - Honest CSV/TSV parser with delimiter auto-detection (',', ';', '\t')
 * - Russian phone normalization (+7XXXXXXXXXX)
 * - Phone duplicate detection & deduplication report builder
 */

export {
	formatBytes,
	readResponse,
	type ColumnMapping,
	type DiscoveryResponse,
	type MapResponse,
	type ReconciliationResponse,
	type RunStatus,
	type UploadResponse,
	type WizardStep,
} from "../migration/migrationTypes";

export type MigrationFieldTarget =
	| "fullName"
	| "phone"
	| "birthDate"
	| "balance"
	| "lastVisitDate"
	| "notes"
	| "ignore";

export interface MigrationFieldTargetMeta {
	target: MigrationFieldTarget;
	label: string;
	required: boolean;
}

export const MIGRATION_FIELD_TARGETS: readonly MigrationFieldTargetMeta[] = [
	{ target: "fullName", label: "ФИО пациента", required: true },
	{ target: "phone", label: "Телефон (+7...)", required: true },
	{ target: "birthDate", label: "Дата рождения", required: false },
	{ target: "balance", label: "Баланс / Депозит (₽)", required: false },
	{ target: "lastVisitDate", label: "История / Последний приём", required: false },
	{ target: "notes", label: "Комментарий / Аллергии", required: false },
	{ target: "ignore", label: "Пропустить колонку", required: false },
];

export interface ParsedPatientPreviewRow {
	rowIndex: number;
	fullName: string;
	rawPhone: string;
	normalizedPhone: string;
	phoneValid: boolean;
	birthDate: string;
	balanceRub: number;
	lastVisitDate: string;
	notes: string;
	isDuplicatePhone: boolean;
	duplicateOfRowIndex: number | null;
	validationStatus: "ready" | "duplicate" | "invalid";
	validationReason: string | null;
}

export interface DeduplicationReport {
	totalRows: number;
	readyCount: number;
	duplicateCount: number;
	invalidCount: number;
	totalPositiveBalanceRub: number;
	totalDebtBalanceRub: number;
}

/**
 * Нормализует телефон РФ к единому стандарту +7XXXXXXXXXX.
 */
export function normalizeRussianPhone(raw: string): {
	normalized: string;
	formatted: string;
	valid: boolean;
} {
	const digits = String(raw ?? "").replace(/\D+/g, "");
	if (!digits) {
		return { normalized: "", formatted: "—", valid: false };
	}

	let tenDigits = "";
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		tenDigits = digits.slice(1);
	} else if (digits.length === 10 && digits.startsWith("9")) {
		tenDigits = digits;
	} else if (digits.length === 11 && digits.startsWith("9")) {
		tenDigits = digits.slice(0, 10);
	}

	if (tenDigits.length !== 10) {
		return { normalized: `+${digits}`, formatted: raw.trim() || "—", valid: false };
	}

	const normalized = `+7${tenDigits}`;
	const formatted = `+7 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6, 8)}-${tenDigits.slice(8, 10)}`;
	return { normalized, formatted, valid: true };
}

function splitDelimitedLine(line: string, delimiter: "," | ";" | "\t"): string[] {
	const cells: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}
		if (ch === delimiter && !inQuotes) {
			cells.push(current.trim());
			current = "";
			continue;
		}
		current += ch;
	}
	cells.push(current.trim());
	return cells;
}

/**
 * Честный парсер CSV/TSV текста с автоопределением разделителя ('\t', ';', ',').
 */
export function parseCsvOrTsvText(rawText: string): {
	headers: string[];
	rows: string[][];
	delimiter: "," | ";" | "\t";
} {
	const clean = String(rawText ?? "").replace(/^\uFEFF/, "").trim();
	if (!clean) {
		return { headers: [], rows: [], delimiter: ";" };
	}

	const lines = clean
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	if (lines.length === 0) {
		return { headers: [], rows: [], delimiter: ";" };
	}

	const firstLine = lines[0] ?? "";
	const tabCount = (firstLine.match(/\t/g) ?? []).length;
	const semiCount = (firstLine.match(/;/g) ?? []).length;
	const commaCount = (firstLine.match(/,/g) ?? []).length;

	let delimiter: "," | ";" | "\t" = ";";
	if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
		delimiter = "\t";
	} else if (commaCount > semiCount) {
		delimiter = ",";
	}

	const headers = splitDelimitedLine(firstLine, delimiter).map(
		(h, idx) => h || `Колонка ${idx + 1}`,
	);
	const rows = lines.slice(1).map((line) => splitDelimitedLine(line, delimiter));

	return { headers, rows, delimiter };
}

/**
 * Автоматически сопоставляет заголовки CSV/TSV с целевыми полями карточки пациента.
 */
export function autoDetectColumnMappings(
	headers: string[],
): Record<string, MigrationFieldTarget> {
	const result: Record<string, MigrationFieldTarget> = {};
	const usedTargets = new Set<MigrationFieldTarget>();

	for (const header of headers) {
		const norm = header.toLowerCase().trim();
		const stripped = norm.replace(/[.\s\-_/\\()]/g, "");
		let detected: MigrationFieldTarget = "ignore";

		if (
			!usedTargets.has("fullName") &&
			(stripped.includes("фио") ||
				stripped.includes("пациент") ||
				stripped.includes("фамил") ||
				stripped.includes("имя") ||
				stripped.includes("fullname") ||
				stripped.includes("клиент") ||
				norm.includes("name"))
		) {
			detected = "fullName";
		} else if (
			!usedTargets.has("phone") &&
			(stripped.includes("тел") ||
				stripped.includes("моб") ||
				stripped.includes("сотов") ||
				stripped.includes("phone") ||
				stripped.includes("mobile") ||
				stripped.includes("контакт"))
		) {
			detected = "phone";
		} else if (
			!usedTargets.has("birthDate") &&
			(stripped.includes("рожд") ||
				stripped.includes("др") ||
				stripped.includes("birth") ||
				stripped.includes("dob") ||
				stripped.includes("возраст"))
		) {
			detected = "birthDate";
		} else if (
			!usedTargets.has("balance") &&
			(stripped.includes("баланс") ||
				stripped.includes("долг") ||
				stripped.includes("депозит") ||
				stripped.includes("аванс") ||
				stripped.includes("остаток") ||
				stripped.includes("balance") ||
				stripped.includes("debt"))
		) {
			detected = "balance";
		} else if (
			!usedTargets.has("lastVisitDate") &&
			(stripped.includes("визит") ||
				stripped.includes("прием") ||
				stripped.includes("приём") ||
				stripped.includes("история") ||
				stripped.includes("visit"))
		) {
			detected = "lastVisitDate";
		} else if (
			!usedTargets.has("notes") &&
			(stripped.includes("прим") ||
				stripped.includes("коммент") ||
				stripped.includes("аллерг") ||
				stripped.includes("note"))
		) {
			detected = "notes";
		}

		if (detected !== "ignore") {
			usedTargets.add(detected);
		}
		result[header] = detected;
	}

	return result;
}

function parseBalanceValue(raw: string): number {
	if (!raw) return 0;
	const cleaned = raw.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
	const parsed = Number.parseFloat(cleaned);
	return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

/**
 * Формирует предпросмотр карточек пациентов, проверяет телефоны и находит дубликаты.
 */
export function buildMigrationPreviewAndDeduplication(
	rows: string[][],
	headers: string[],
	columnMap: Record<string, MigrationFieldTarget>,
): { records: ParsedPatientPreviewRow[]; report: DeduplicationReport } {
	const seenPhones = new Map<string, number>();
	const records: ParsedPatientPreviewRow[] = [];

	let readyCount = 0;
	let duplicateCount = 0;
	let invalidCount = 0;
	let totalPositiveBalanceRub = 0;
	let totalDebtBalanceRub = 0;

	const findColIndex = (target: MigrationFieldTarget): number =>
		headers.findIndex((h) => columnMap[h] === target);

	const nameIdx = findColIndex("fullName");
	const phoneIdx = findColIndex("phone");
	const birthIdx = findColIndex("birthDate");
	const balanceIdx = findColIndex("balance");
	const visitIdx = findColIndex("lastVisitDate");
	const notesIdx = findColIndex("notes");

	rows.forEach((cells, idx) => {
		const rowNumber = idx + 1;
		const fullName = (nameIdx >= 0 ? cells[nameIdx] : "")?.trim() ?? "";
		const rawPhone = (phoneIdx >= 0 ? cells[phoneIdx] : "")?.trim() ?? "";
		const birthDate = (birthIdx >= 0 ? cells[birthIdx] : "")?.trim() ?? "";
		const balanceRub = parseBalanceValue(balanceIdx >= 0 ? (cells[balanceIdx] ?? "") : "");
		const lastVisitDate = (visitIdx >= 0 ? cells[visitIdx] : "")?.trim() ?? "";
		const notes = (notesIdx >= 0 ? cells[notesIdx] : "")?.trim() ?? "";

		const phoneInfo = normalizeRussianPhone(rawPhone);
		let isDuplicatePhone = false;
		let duplicateOfRowIndex: number | null = null;

		if (phoneInfo.valid && seenPhones.has(phoneInfo.normalized)) {
			isDuplicatePhone = true;
			duplicateOfRowIndex = seenPhones.get(phoneInfo.normalized) ?? null;
		} else if (phoneInfo.valid) {
			seenPhones.set(phoneInfo.normalized, rowNumber);
		}

		let validationStatus: ParsedPatientPreviewRow["validationStatus"] = "ready";
		let validationReason: string | null = null;

		if (!fullName || fullName.length < 2) {
			validationStatus = "invalid";
			validationReason = "Не указано ФИО пациента";
			invalidCount += 1;
		} else if (!phoneInfo.valid) {
			validationStatus = "invalid";
			validationReason = "Некорректный формат телефона РФ";
			invalidCount += 1;
		} else if (isDuplicatePhone) {
			validationStatus = "duplicate";
			validationReason = `Дубликат телефона (строка #${duplicateOfRowIndex})`;
			duplicateCount += 1;
		} else {
			readyCount += 1;
			if (balanceRub > 0) totalPositiveBalanceRub += balanceRub;
			if (balanceRub < 0) totalDebtBalanceRub += Math.abs(balanceRub);
		}

		records.push({
			rowIndex: rowNumber,
			fullName: fullName || "Без имени",
			rawPhone,
			normalizedPhone: phoneInfo.formatted,
			phoneValid: phoneInfo.valid,
			birthDate,
			balanceRub,
			lastVisitDate,
			notes,
			isDuplicatePhone,
			duplicateOfRowIndex,
			validationStatus,
			validationReason,
		});
	});

	return {
		records,
		report: {
			totalRows: rows.length,
			readyCount,
			duplicateCount,
			invalidCount,
			totalPositiveBalanceRub: Math.round(totalPositiveBalanceRub * 100) / 100,
			totalDebtBalanceRub: Math.round(totalDebtBalanceRub * 100) / 100,
		},
	};
}
