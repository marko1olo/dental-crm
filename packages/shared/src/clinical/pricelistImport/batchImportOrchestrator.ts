/**
 * packages/shared/src/clinical/pricelistImport/batchImportOrchestrator.ts
 *
 * Tabular Price List Import Orchestration, Deduplication & Cross-Referencing.
 */

import type { ServiceCatalogItem } from "../../index.js";
import {
	normalizeDoctorSpecialtyName,
	normalizeServiceCategoryName,
	STATUTORY_CATEGORY_CODES_MAP,
	STATUTORY_CATEGORY_DURATIONS_MAP,
} from "./nomenclature804nMatcher.js";
import {
	autoMapColumns,
	detectVendorSignature,
	findHeaderRowIndex,
	normalizePricelistPrice,
} from "./rowParser.js";
import {
	type ColumnMappingConfig,
	type ParsedTabularRow,
	PRICELIST_VENDOR_LABELS,
	type TabularImportAnalysis,
	type TabularRowValidationError,
} from "./types.js";

// =============================================================================
// DEDUPLICATION & CROSS-REFERENCING ENGINE
// =============================================================================

function normalizeTitleForComparison(title: string): string {
	return title
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[«»""''„“]/g, '"')
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Fast Levenshtein distance similarity (0..1) for title deduplication.
 */
function titleSimilarity(s1: string, s2: string): number {
	if (s1 === s2) return 1.0;
	if (!s1 || !s2) return 0.0;
	if (s1.includes(s2) || s2.includes(s1)) {
		const minLen = Math.min(s1.length, s2.length);
		const maxLen = Math.max(s1.length, s2.length);
		return Math.max(0.85, minLen / maxLen);
	}

	const len1 = s1.length;
	const len2 = s2.length;
	if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.4) return 0.0;

	// Bounded matrix for short prefixes
	const d: number[][] = [];
	for (let i = 0; i <= len1; i++) d[i] = [i];
	// biome-ignore lint/style/noNonNullAssertion: safe 0-index initialization
	for (let j = 0; j <= len2; j++) d[0]![j] = j;

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			// biome-ignore lint/style/noNonNullAssertion: bounded array
			d[i]![j] = Math.min(
				d[i - 1]![j]! + 1,
				d[i]![j - 1]! + 1,
				d[i - 1]![j - 1]! + cost,
			);
		}
	}

	// biome-ignore lint/style/noNonNullAssertion: bounded matrix access
	const dist = d[len1]![len2]!;
	const maxLen = Math.max(len1, len2);
	return 1 - dist / maxLen;
}

export function crossReferenceTabularRow(
	itemCode: string | undefined,
	itemTitle: string,
	priceKopecks: number,
	existingItems: readonly ServiceCatalogItem[],
): {
	action: "create_new" | "update_existing" | "identical";
	matchedId?: string | null | undefined;
	matchedTitle?: string | null | undefined;
	matchedPriceRub?: number | null | undefined;
} {
	if (!existingItems || existingItems.length === 0) {
		return { action: "create_new" };
	}

	const normCode = (itemCode || "").trim().toUpperCase();
	const normTitle = normalizeTitleForComparison(itemTitle);

	// 1. Exact Code Match
	if (normCode) {
		const matchByCode = existingItems.find(
			(e) => (e.code || "").trim().toUpperCase() === normCode,
		);
		if (matchByCode) {
			const existingKopecks = Math.round((matchByCode.basePriceRub ?? 0) * 100);
			const isSamePrice = existingKopecks === priceKopecks;
			return {
				action: isSamePrice ? "identical" : "update_existing",
				matchedId: matchByCode.id,
				matchedTitle: matchByCode.title,
				matchedPriceRub: matchByCode.basePriceRub,
			};
		}
	}

	// 2. Exact Normalized Title Match
	const matchByTitle = existingItems.find(
		(e) => normalizeTitleForComparison(e.title) === normTitle,
	);
	if (matchByTitle) {
		const existingKopecks = Math.round((matchByTitle.basePriceRub ?? 0) * 100);
		const isSamePrice = existingKopecks === priceKopecks;
		return {
			action: isSamePrice ? "identical" : "update_existing",
			matchedId: matchByTitle.id,
			matchedTitle: matchByTitle.title,
			matchedPriceRub: matchByTitle.basePriceRub,
		};
	}

	// 3. Fuzzy Title Match (Similarity >= 0.85)
	if (normTitle.length >= 8) {
		let bestMatch: ServiceCatalogItem | null = null;
		let bestSim = 0;

		for (const e of existingItems) {
			const sim = titleSimilarity(
				normTitle,
				normalizeTitleForComparison(e.title),
			);
			if (sim > bestSim && sim >= 0.85) {
				bestSim = sim;
				bestMatch = e;
			}
		}

		if (bestMatch) {
			const existingKopecks = Math.round((bestMatch.basePriceRub ?? 0) * 100);
			const isSamePrice = existingKopecks === priceKopecks;
			return {
				action: isSamePrice ? "identical" : "update_existing",
				matchedId: bestMatch.id,
				matchedTitle: bestMatch.title,
				matchedPriceRub: bestMatch.basePriceRub,
			};
		}
	}

	return { action: "create_new" };
}

// =============================================================================
// FULL TABULAR ANALYSIS PIPELINE
// =============================================================================

export function analyzeTabularPricelist({
	rows,
	customMapping,
	existingCatalog = [],
}: {
	readonly rows: readonly string[][];
	readonly customMapping?: Partial<ColumnMappingConfig> | undefined;
	readonly existingCatalog?: readonly ServiceCatalogItem[] | undefined;
}): TabularImportAnalysis {
	if (!rows || rows.length === 0) {
		return {
			vendorSignature: "generic_table",
			vendorLabel: PRICELIST_VENDOR_LABELS.generic_table,
			detectedMapping: { titleCol: 0, priceCol: 1 },
			headerRowIndex: 0,
			headers: [],
			previewRows: [],
			allRows: [],
			totalRows: 0,
			validRowsCount: 0,
			errorRowsCount: 0,
			stats: { newCount: 0, updateCount: 0, identicalCount: 0 },
			errors: [{ rowNumber: 1, field: "file", message: "Файл не содержит строк данных" }],
		};
	}

	const headerRowIndex = findHeaderRowIndex(rows);
	const headers = (rows[headerRowIndex] || []).map((h) => (h || "").trim());

	const vendorSignature = detectVendorSignature(headers);
	const vendorLabel = PRICELIST_VENDOR_LABELS[vendorSignature];

	const autoMapping = autoMapColumns(headers);
	const effectiveMapping: ColumnMappingConfig = {
		...autoMapping,
		...customMapping,
		titleCol: customMapping?.titleCol ?? autoMapping.titleCol,
		priceCol: customMapping?.priceCol ?? autoMapping.priceCol,
	};

	const allRows: ParsedTabularRow[] = [];
	const errors: TabularRowValidationError[] = [];

	let newCount = 0;
	let updateCount = 0;
	let identicalCount = 0;
	let validRowsCount = 0;
	let errorRowsCount = 0;

	const startDataIndex = headerRowIndex + 1;

	for (let r = startDataIndex; r < rows.length; r++) {
		const rawRow = rows[r] || [];
		const rowNumber = r + 1; // 1-based row index for humans

		// Skip entirely empty rows
		if (rawRow.every((c) => !c || c.trim() === "")) {
			continue;
		}

		const titleRaw = (rawRow[effectiveMapping.titleCol] || "").trim();
		const priceRaw = (rawRow[effectiveMapping.priceCol] || "").trim();

		// Check if title is present
		if (!titleRaw) {
			errorRowsCount++;
			const err: TabularRowValidationError = {
				rowNumber,
				field: "title",
				message: "Отсутствует наименование услуги",
				rawCell: "",
			};
			errors.push(err);
			allRows.push({
				rowNumber,
				rawCells: rawRow,
				commercialTitle: "(без наименования)",
				category: "other",
				specialty: "universal",
				priceRub: 0,
				priceKopecks: 0,
				durationMinutes: 30,
				validationStatus: "error",
				validationMessage: err.message,
				suggestedAction: "create_new",
			});
			continue;
		}

		// Normalize price
		const priceResult = normalizePricelistPrice(priceRaw);
		if (!priceResult.success) {
			errorRowsCount++;
			const err: TabularRowValidationError = {
				rowNumber,
				field: "price",
				message: priceResult.error || "Некорректная цена услуги",
				rawCell: priceRaw,
			};
			errors.push(err);
			allRows.push({
				rowNumber,
				rawCells: rawRow,
				commercialTitle: titleRaw,
				category: "other",
				specialty: "universal",
				priceRub: 0,
				priceKopecks: 0,
				durationMinutes: 30,
				validationStatus: "error",
				validationMessage: err.message,
				suggestedAction: "create_new",
			});
			continue;
		}

		// Extract code and category
		const code =
			effectiveMapping.codeCol !== undefined
				? (rawRow[effectiveMapping.codeCol] || "").trim() || undefined
				: undefined;

		const explicit804n =
			effectiveMapping.order804nCol !== undefined
				? (rawRow[effectiveMapping.order804nCol] || "").trim() || undefined
				: undefined;

		const categoryRaw =
			effectiveMapping.categoryCol !== undefined
				? (rawRow[effectiveMapping.categoryCol] || "").trim()
				: "";
		const category = normalizeServiceCategoryName(categoryRaw || titleRaw);

		const specialtyRaw =
			effectiveMapping.specialtyCol !== undefined
				? (rawRow[effectiveMapping.specialtyCol] || "").trim()
				: "";
		const specialty = normalizeDoctorSpecialtyName(specialtyRaw || category);

		// Resolve 804n statutory code (ZERO MOCKS: no fake A16.07.999.xxx)
		let resolved804n = explicit804n;
		if (!resolved804n) {
			// Check if code matches 804n syntax (e.g. A16.07.002 or B01.065.001)
			if (code && /^[ABАВ]\d{2}\.\d{2}\.\d{3}/i.test(code)) {
				resolved804n = code.toUpperCase().replace(/^А/, "A").replace(/^В/, "B");
			} else {
				// Statutory category default
				resolved804n = STATUTORY_CATEGORY_CODES_MAP[category] || "A16.07.002";
			}
		}

		// Extract duration
		let durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[category] || 30;
		if (effectiveMapping.durationCol !== undefined) {
			const durRaw = (rawRow[effectiveMapping.durationCol] || "").trim();
			const parsedDur = parseInt(durRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsedDur) && parsedDur > 0 && parsedDur <= 480) {
				durationMinutes = parsedDur;
			}
		}

		// Extract cost
		let costRub: number | undefined;
		if (effectiveMapping.costCol !== undefined) {
			const costRaw = (rawRow[effectiveMapping.costCol] || "").trim();
			const costRes = normalizePricelistPrice(costRaw);
			if (costRes.success) costRub = costRes.priceRub;
		}

		// Extract warranty
		let warrantyMonths: number | undefined;
		if (effectiveMapping.warrantyCol !== undefined) {
			const warRaw = (rawRow[effectiveMapping.warrantyCol] || "").trim();
			const parsedWar = parseInt(warRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsedWar) && parsedWar >= 0 && parsedWar <= 120) {
				warrantyMonths = parsedWar;
			}
		}

		// Cross-reference with existing catalog
		const crossRef = crossReferenceTabularRow(
			code,
			titleRaw,
			priceResult.priceKopecks,
			existingCatalog,
		);

		if (crossRef.action === "create_new") newCount++;
		else if (crossRef.action === "update_existing") updateCount++;
		else if (crossRef.action === "identical") identicalCount++;

		validRowsCount++;

		allRows.push({
			rowNumber,
			rawCells: rawRow,
			code,
			order804nCode: resolved804n,
			commercialTitle: titleRaw,
			category,
			specialty,
			priceRub: priceResult.priceRub,
			priceKopecks: priceResult.priceKopecks,
			costRub,
			durationMinutes,
			warrantyMonths,
			validationStatus: "valid",
			suggestedAction: crossRef.action,
			matchedExistingServiceId: crossRef.matchedId,
			matchedExistingTitle: crossRef.matchedTitle,
			matchedExistingPriceRub: crossRef.matchedPriceRub,
		});
	}

	return {
		vendorSignature,
		vendorLabel,
		detectedMapping: effectiveMapping,
		headerRowIndex,
		headers,
		previewRows: allRows.slice(0, 10),
		allRows,
		totalRows: allRows.length,
		validRowsCount,
		errorRowsCount,
		stats: {
			newCount,
			updateCount,
			identicalCount,
		},
		errors,
	};
}
