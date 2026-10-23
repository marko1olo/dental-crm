import type { ServiceCatalogItem } from "../index.js";
import {
	type ColumnMappingConfig,
	crossReferenceTabularRow,
	normalizeDoctorSpecialtyName,
	normalizePricelistPrice,
	normalizeServiceCategoryName,
	STATUTORY_CATEGORY_DURATIONS_MAP,
} from "../clinical/pricelistBatchImport.js";
import { matchOrder804nNomenclature } from "./matcher804n.js";
import type { ScannedPriceItem } from "./priceScannerTypes.js";

export interface ParsedTabularRowResult {
	readonly item?: ScannedPriceItem | undefined;
	readonly error?: { field: string; message: string; rawInput: string } | undefined;
	readonly isNew: boolean;
	readonly isUpdate: boolean;
	readonly isIdentical: boolean;
	readonly isExactCode: boolean;
	readonly isCategoryRecognized: boolean;
	readonly confidence: number;
}

export function parseTabularRow(params: {
	rawRow: string[];
	rowNumber: number;
	effectiveMapping: ColumnMappingConfig;
	existingCatalog: readonly ServiceCatalogItem[];
}): ParsedTabularRowResult | null {
	const { rawRow, rowNumber, effectiveMapping, existingCatalog } = params;
	if (rawRow.every((c) => !c || c.trim() === "")) return null;

	const titleRaw = (rawRow[effectiveMapping.titleCol] || "").trim();
	const priceRaw = (rawRow[effectiveMapping.priceCol] || "").trim();
	if (!titleRaw) {
		return {
			error: { field: "title", message: "Отсутствует наименование услуги", rawInput: rawRow.join(" | ") },
			isNew: false, isUpdate: false, isIdentical: false, isExactCode: false, isCategoryRecognized: false, confidence: 0,
		};
	}

	const priceResult = normalizePricelistPrice(priceRaw);
	const explicitCode = effectiveMapping.codeCol !== undefined ? (rawRow[effectiveMapping.codeCol] || "").trim() || undefined : undefined;
	const explicit804n = effectiveMapping.order804nCol !== undefined ? (rawRow[effectiveMapping.order804nCol] || "").trim() || undefined : undefined;
	const categoryRaw = effectiveMapping.categoryCol !== undefined ? (rawRow[effectiveMapping.categoryCol] || "").trim() : "";
	const category = normalizeServiceCategoryName(categoryRaw || titleRaw);
	const specialtyRaw = effectiveMapping.specialtyCol !== undefined ? (rawRow[effectiveMapping.specialtyCol] || "").trim() : "";
	const specialty = normalizeDoctorSpecialtyName(specialtyRaw || category);

	const matchResult = matchOrder804nNomenclature(titleRaw, {
		codeHint: explicit804n || explicitCode,
		categoryHint: categoryRaw || category,
		specialtyHint: specialtyRaw || specialty,
	});

	let durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[matchResult.category] || 30;
	if (effectiveMapping.durationCol !== undefined) {
		const parsed = parseInt((rawRow[effectiveMapping.durationCol] || "").replace(/\D/g, ""), 10);
		if (Number.isFinite(parsed) && parsed > 0 && parsed <= 480) durationMinutes = parsed;
	}

	let costRub: number | undefined;
	if (effectiveMapping.costCol !== undefined) {
		const costRes = normalizePricelistPrice((rawRow[effectiveMapping.costCol] || "").trim());
		if (costRes.success) costRub = costRes.priceRub;
	}

	let warrantyMonths: number | undefined;
	if (effectiveMapping.warrantyCol !== undefined) {
		const parsed = parseInt((rawRow[effectiveMapping.warrantyCol] || "").replace(/\D/g, ""), 10);
		if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 120) warrantyMonths = parsed;
	}

	const crossRef = crossReferenceTabularRow(explicitCode || matchResult.code804n, titleRaw, priceResult.priceKopecks, existingCatalog);
	const validationStatus = priceResult.success ? "valid" : "error";

	const item: ScannedPriceItem = {
		id: `item-row-${rowNumber}-${Date.now().toString(36)}`,
		rowNumber,
		rawInput: rawRow.join(" | "),
		cleanedTitle: matchResult.cleanedTitle || titleRaw,
		code: explicitCode,
		code804n: matchResult.code804n,
		statutoryTitle804n: matchResult.statutoryTitle804n,
		category: matchResult.category,
		specialty: matchResult.specialty,
		priceRub: priceResult.priceRub,
		priceKopecks: priceResult.priceKopecks,
		costRub,
		durationMinutes,
		warrantyMonths,
		confidence: matchResult.confidence,
		confidenceKind: matchResult.confidenceKind,
		validationStatus,
		validationMessage: priceResult.error,
		suggestedAction: crossRef.action,
		matchedExistingServiceId: crossRef.matchedId,
		matchedExistingTitle: crossRef.matchedTitle,
		matchedExistingPriceRub: crossRef.matchedPriceRub,
		isApproved: validationStatus === "valid",
	};

	return {
		item,
		error: priceResult.success ? undefined : { field: "price", message: priceResult.error || "Некорректная цена услуги", rawInput: priceRaw },
		isNew: crossRef.action === "create_new",
		isUpdate: crossRef.action === "update_existing",
		isIdentical: crossRef.action === "identical",
		isExactCode: matchResult.confidenceKind === "exact_code",
		isCategoryRecognized: matchResult.category !== "other" && matchResult.category !== "documents",
		confidence: matchResult.confidence,
	};
}
