/**
 * Infodent / Infoclinica / Denta Office CSV & Delimited Exporter Parser.
 *
 * Поддерживает парсинг выгрузок МИС Инфодент, Инфоклиника, Denta Office:
 * - Разделители: ;, ,, \t, |
 * - Автоопределение заголовков, кодировок и сущностей (пациенты, визиты, счета/оплаты, прайс-лист)
 * - Нормализация ФИО, дат рождения (DD.MM.YYYY -> YYYY-MM-DD), телефонов в E.164 (+7XXXXXXXXXX), полов и денежных сумм в копейках.
 */

import { normalizeDate, parseKopecks, rublesToKopecks } from "@dental/shared";

export interface InfodentPatientRecord {
	externalId: string;
	fullName: string;
	lastName: string;
	firstName: string;
	middleName: string;
	birthDate: string | null;
	phone: string | null;
	secondaryPhone: string | null;
	email: string | null;
	gender: "male" | "female" | "unknown";
	address: string | null;
	notes: string | null;
	discountCard: string | null;
	balanceRub: number | null;
	balanceKopecks: number | null;
	passport: string | null;
	snils: string | null;
	inn: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentVisitRecord {
	externalId: string;
	patientRef: string;
	doctorRef: string | null;
	doctorName: string | null;
	date: string;
	time: string | null;
	startsAt: string | null;
	endsAt: string | null;
	durationMinutes: number | null;
	status: "scheduled" | "completed" | "cancelled" | "no_show";
	reason: string | null;
	diagnosis: string | null;
	treatment: string | null;
	notes: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentPaymentItem {
	code: string | null;
	name: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	sumRub: number;
	sumKopecks: number;
}

export interface InfodentPaymentRecord {
	externalId: string;
	patientRef: string;
	amountRub: number;
	amountKopecks: number;
	paidAt: string;
	method: "cash" | "card" | "sbp" | "transfer" | "insurance" | "other";
	note: string | null;
	items: InfodentPaymentItem[];
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentPriceItem {
	code: string;
	name: string;
	priceRub: number;
	priceKopecks: number;
	category: string | null;
	unit: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentCsvParseResult {
	detectedEntity:
		| "patient"
		| "visit"
		| "payment"
		| "pricelist"
		| "mixed"
		| "unknown";
	delimiter: string;
	headers: string[];
	patients: InfodentPatientRecord[];
	visits: InfodentVisitRecord[];
	payments: InfodentPaymentRecord[];
	priceList: InfodentPriceItem[];
	rawRowCount: number;
	parsedRowCount: number;
	warnings: string[];
}

export interface InfodentCsvParserOptions {
	delimiter?: string;
	expectedEntity?: "patient" | "visit" | "payment" | "pricelist" | "auto";
	skipInvalidRows?: boolean;
}

// Алиасы колонок пациентов Инфодент/Инфоклиника
import {
  PATIENT_HEADER_ALIASES,
  VISIT_HEADER_ALIASES,
  PAYMENT_HEADER_ALIASES,
  PRICELIST_HEADER_ALIASES
} from "./infodentAliases.js";
import { InfodentExtractors } from "./infodentExtractors.js";
import { detectCsvDelimiter, parseCsvRows as universalParseCsvRows } from "./csvParser.js";

export class InfodentCsvParser {
	/**
	 * Главный метод парсинга CSV контента Инфодент
	 */
	public static parse(
		csvContent: string,
		options: InfodentCsvParserOptions = {},
	): InfodentCsvParseResult {
		const warnings: string[] = [];
		const trimmedContent = csvContent.trim();
		if (!trimmedContent) {
			return {
				detectedEntity: "unknown",
				delimiter: ";",
				headers: [],
				patients: [],
				visits: [],
				payments: [],
				priceList: [],
				rawRowCount: 0,
				parsedRowCount: 0,
				warnings: ["CSV контент пуст."],
			};
		}

		const delimiter =
			options.delimiter || InfodentCsvParser.detectDelimiter(trimmedContent);
		const rows = InfodentCsvParser.parseCsvRows(trimmedContent, delimiter);
		if (!rows.length) {
			return {
				detectedEntity: "unknown",
				delimiter,
				headers: [],
				patients: [],
				visits: [],
				payments: [],
				priceList: [],
				rawRowCount: 0,
				parsedRowCount: 0,
				warnings: ["Не удалось выделить строки таблицы."],
			};
		}

		// Ищем строку заголовка (пропускаем преамбулу отчета, если она есть)
		const { headerIndex, headers } = InfodentCsvParser.findHeaderRow(rows);
		const dataRows = rows.slice(headerIndex + 1);

		const entityKind =
			options.expectedEntity && options.expectedEntity !== "auto"
				? options.expectedEntity
				: InfodentCsvParser.detectEntityKind(headers);

		const patients: InfodentPatientRecord[] = [];
		const visits: InfodentVisitRecord[] = [];
		const payments: InfodentPaymentRecord[] = [];
		const priceList: InfodentPriceItem[] = [];

		if (entityKind === "patient" || entityKind === "unknown") {
			const parsed = InfodentExtractors.extractPatients(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			patients.push(...parsed);
		}
		if (entityKind === "visit") {
			const parsed = InfodentExtractors.extractVisits(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			visits.push(...parsed);
		}
		if (entityKind === "payment") {
			const parsed = InfodentExtractors.extractPayments(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			payments.push(...parsed);
		}
		if (entityKind === "pricelist") {
			const parsed = InfodentExtractors.extractPriceList(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			priceList.push(...parsed);
		}

		const parsedRowCount =
			patients.length + visits.length + payments.length + priceList.length;

		return {
			detectedEntity: entityKind,
			delimiter,
			headers,
			patients,
			visits,
			payments,
			priceList,
			rawRowCount: dataRows.length,
			parsedRowCount,
			warnings,
		};
	}

	/**
	 * Быстрый парсер только пациентов
	 */
	public static parsePatients(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPatientRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "patient",
		});
		return result.patients;
	}

	/**
	 * Быстрый парсер визитов
	 */
	public static parseVisits(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentVisitRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "visit",
		});
		return result.visits;
	}

	/**
	 * Быстрый парсер оплат
	 */
	public static parsePayments(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPaymentRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "payment",
		});
		return result.payments;
	}

	/**
	 * Быстрый парсер прайс-листа
	 */
	public static parsePriceList(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPriceItem[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "pricelist",
		});
		return result.priceList;
	}

	/**
	 * Определение разделителя CSV (; , \t |)
	 */
	public static detectDelimiter(text: string): string {
		const firstLines = text
			.split(/\r?\n/)
			.slice(0, 10)
			.filter((l) => l.trim().length > 0);
		if (!firstLines.length) return ";";

		const delimiters = [";", ",", "\t", "|"];
		let bestDelimiter = ";";
		let maxScore = -1;

		for (const d of delimiters) {
			let totalCols = 0;
			let lineCount = 0;
			for (const line of firstLines) {
				const cols = line.split(d).length;
				if (cols > 1) {
					totalCols += cols;
					lineCount++;
				}
			}
			if (lineCount > 0) {
				const score = totalCols * (lineCount / firstLines.length);
				if (score > maxScore) {
					maxScore = score;
					bestDelimiter = d;
				}
			}
		}

		return bestDelimiter;
	}

	/**
	 * Поиск строки заголовков с пропуском служебных строк отчета
	 */
	private static findHeaderRow(rows: string[][]): {
		headerIndex: number;
		headers: string[];
	} {
		for (let i = 0; i < Math.min(rows.length, 15); i++) {
			const candidateRow = rows[i];
			if (!candidateRow) continue;
			const normalizedRow = candidateRow.map((c) =>
				InfodentCsvParser.normalizeHeader(c),
			);
			const hasPatientHeader = normalizedRow.some((h) =>
				PATIENT_HEADER_ALIASES.fullName.includes(h),
			);
			const hasVisitHeader = normalizedRow.some((h) =>
				VISIT_HEADER_ALIASES.date.includes(h),
			);
			const hasPaymentHeader = normalizedRow.some((h) =>
				PAYMENT_HEADER_ALIASES.amount.includes(h),
			);
			const hasPriceHeader = normalizedRow.some(
				(h) =>
					PRICELIST_HEADER_ALIASES.name.includes(h) &&
					PRICELIST_HEADER_ALIASES.price.includes(h),
			);

			if (
				hasPatientHeader ||
				hasVisitHeader ||
				hasPaymentHeader ||
				hasPriceHeader
			) {
				return { headerIndex: i, headers: candidateRow.map((c) => c.trim()) };
			}
		}
		// Если сигнатуры не найдены, считаем 0-ю строку заголовком
		const first = rows[0] || [];
		return { headerIndex: 0, headers: first.map((c) => c.trim()) };
	}

	/**
	 * Определение типа сущности по колонкам
	 */
	public static detectEntityKind(
		headers: string[],
	): "patient" | "visit" | "payment" | "pricelist" | "unknown" {
		const normalized = headers.map((h) => InfodentCsvParser.normalizeHeader(h));

		let patientScore = 0;
		let visitScore = 0;
		let paymentScore = 0;
		let priceScore = 0;

		for (const h of normalized) {
			if (PATIENT_HEADER_ALIASES.fullName.includes(h)) patientScore += 4;
			if (PATIENT_HEADER_ALIASES.phone.includes(h)) patientScore += 3;
			if (PATIENT_HEADER_ALIASES.birthDate.includes(h)) patientScore += 3;
			if (PATIENT_HEADER_ALIASES.externalId.includes(h)) patientScore += 1;

			if (VISIT_HEADER_ALIASES.date.includes(h)) visitScore += 3;
			if (VISIT_HEADER_ALIASES.doctorName.includes(h)) visitScore += 3;
			if (VISIT_HEADER_ALIASES.reason.includes(h)) visitScore += 2;
			if (VISIT_HEADER_ALIASES.diagnosis.includes(h)) visitScore += 3;

			if (PAYMENT_HEADER_ALIASES.amount.includes(h)) paymentScore += 4;
			if (PAYMENT_HEADER_ALIASES.paidAt.includes(h)) paymentScore += 3;
			if (PAYMENT_HEADER_ALIASES.method.includes(h)) paymentScore += 2;

			if (PRICELIST_HEADER_ALIASES.price.includes(h)) priceScore += 3;
			if (PRICELIST_HEADER_ALIASES.name.includes(h)) priceScore += 3;
			if (PRICELIST_HEADER_ALIASES.category.includes(h)) priceScore += 2;
		}

		if (
			patientScore > visitScore &&
			patientScore > paymentScore &&
			patientScore > priceScore
		)
			return "patient";
		if (
			visitScore > patientScore &&
			visitScore > paymentScore &&
			visitScore > priceScore
		)
			return "visit";
		if (
			paymentScore > patientScore &&
			paymentScore > visitScore &&
			paymentScore > priceScore
		)
			return "payment";
		if (
			priceScore > patientScore &&
			priceScore > visitScore &&
			priceScore > paymentScore
		)
			return "pricelist";

		return "patient"; // По умолчанию
	}

	/**
	 * Извлечение пациентов из строк таблицы
	 */
	public static buildColumnMapping<T extends Record<string, string[]>>(
		headers: string[],
		aliasMap: T,
	): Record<keyof T, number> {
		const result = {} as Record<keyof T, number>;
		const normalizedHeaders = headers.map((h) =>
			InfodentCsvParser.normalizeHeader(h),
		);

		for (const [targetKey, aliases] of Object.entries(aliasMap)) {
			let foundIdx = -1;
			for (const alias of aliases as string[]) {
				const idx = normalizedHeaders.indexOf(alias);
				if (idx >= 0) {
					foundIdx = idx;
					break;
				}
			}
			// Частичный поиск, если точного совпадения нет
			if (foundIdx === -1) {
				for (const alias of aliases as string[]) {
					const idx = normalizedHeaders.findIndex(
						(h) => h.includes(alias) || alias.includes(h),
					);
					if (idx >= 0) {
						foundIdx = idx;
						break;
					}
				}
			}
			if (foundIdx >= 0) {
				result[targetKey as keyof T] = foundIdx;
			}
		}

		return result;
	}

	/**
	 * Разбор CSV с учетом кавычек и экранирования
	 */
	public static parseCsvRows(content: string, delimiter: string): string[][] {
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentCell = "";
		let inQuotes = false;

		const len = content.length;
		for (let i = 0; i < len; i++) {
			const char = content[i];
			const nextChar = content[i + 1];

			if (inQuotes) {
				if (char === '"') {
					if (nextChar === '"') {
						currentCell += '"';
						i++; // Пропускаем сдвоенную кавычку
					} else {
						inQuotes = false;
					}
				} else {
					currentCell += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === delimiter) {
					currentRow.push(currentCell);
					currentCell = "";
				} else if (char === "\r") {
					if (nextChar === "\n") i++;
					currentRow.push(currentCell);
					rows.push(currentRow);
					currentRow = [];
					currentCell = "";
				} else if (char === "\n") {
					currentRow.push(currentCell);
					rows.push(currentRow);
					currentRow = [];
					currentCell = "";
				} else {
					currentCell += char;
				}
			}
		}

		if (currentCell || currentRow.length > 0) {
			currentRow.push(currentCell);
			rows.push(currentRow);
		}

		return rows;
	}

	/**
	 * Преобразование разобранных пациентов в канонический формат DENTE CSV
	 */
	public static toDentePatientCsv(patients: InfodentPatientRecord[]): string {
		const header = "ФИО;Телефон;Дата рождения;Комментарий";
		const lines = patients.map((p) => {
			const notes = [
				p.notes,
				p.address ? `Адрес: ${p.address}` : null,
				p.discountCard ? `Скидка: ${p.discountCard}` : null,
				p.balanceRub !== null ? `Баланс: ${p.balanceRub} руб.` : null,
				p.passport ? `Паспорт: ${p.passport}` : null,
			]
				.filter(Boolean)
				.join(" | ");

			const phoneStr = p.phone ?? "";
			const birthDateStr = p.birthDate ?? "";
			const escapedNotes = notes.includes(";") ? `"${notes}"` : notes;

			return `${p.fullName};${phoneStr};${birthDateStr};${escapedNotes}`;
		});

		return [header, ...lines].join("\n");
	}

	// Хелперы нормализации
	public static normalizeHeader(value: string): string {
		return value
			.toLowerCase()
			.replace(/[\s_.-]+/g, "")
			.replace(/[^a-zа-яё0-9]/gi, "")
			.trim();
	}

	public static normalizePhone(value: string | null | undefined): string | null {
		if (!value) return null;
		const digits = value.replace(/\D/g, "");
		if (digits.length === 10) return `+7${digits}`;
		if (digits.length === 11 && digits.startsWith("8"))
			return `+7${digits.slice(1)}`;
		if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
		if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
		return null;
	}

	public static normalizeDate(value: string | null | undefined): string | null {
		return normalizeDate(value);
	}

	public static normalizeGender(
		value: string | null | undefined,
	): "male" | "female" | "unknown" {
		if (!value) return "unknown";
		const str = value.trim().toLowerCase();
		if (/^(m|male|муж|м|1)$/i.test(str)) return "male";
		if (/^(f|female|жен|ж|2)$/i.test(str)) return "female";
		return "unknown";
	}

	public static splitFullName(fullName: string): {
		lastName: string;
		firstName: string;
		middleName: string;
	} {
		const parts = fullName
			.trim()
			.split(/\s+/)
			.filter(Boolean);
		return {
			lastName: parts[0] ?? "",
			firstName: parts[1] ?? "",
			middleName: parts.slice(2).join(" "),
		};
	}

	public static parseKopecks(
		value: string | number | null | undefined,
	): number | null {
		if (value === null || value === undefined || value === "") return null;
		try {
			if (typeof value === "number") {
				return Number.isFinite(value) && !Number.isNaN(value) ? rublesToKopecks(value) : null;
			}
			const cleaned = String(value).replace(/\s+/g, "").replace(",", ".");
			return parseKopecks(cleaned);
		} catch {
			const num = Number.parseFloat(String(value).replace(/\s+/g, "").replace(",", "."));
			return Number.isNaN(num) ? null : Math.round(num * 100);
		}
	}
}


export { InfodentCsvParser as InfodentParser };
