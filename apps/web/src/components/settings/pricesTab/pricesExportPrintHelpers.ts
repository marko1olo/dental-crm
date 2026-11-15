import type { ServiceCatalogItem } from "@dental/shared";
import {
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	generatePrintablePricelistHtml,
	importPricelistFromCsv,
	rublesToKopecks,
} from "../../catalog/pricelist/servicePricelistEngine";
import {
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type ServicePricelistItem,
} from "../../catalog/pricelist/servicePricelistPresets";
import { showToast } from "../../GlobalToast";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
	MappingConfidenceKind,
	SuggestedAction,
} from "../../catalog/mappingDiff/types";

function extractCatalogItemPriceRub(item: ServiceCatalogItem): number {
	const legacy = item as ServiceCatalogItem & {
		readonly priceRub?: number | undefined;
	};
	const rawPrice =
		item.basePriceRub ??
		legacy.priceRub ??
		(item.priceKopecks != null ? item.priceKopecks / 100 : 0);
	return Number.isFinite(rawPrice) ? Math.round(rawPrice * 100) / 100 : 0;
}

function toPricelistCategory(category: string | undefined): Order804nCategory {
	switch (category) {
		case "therapy":
		case "surgery":
		case "orthopedics":
		case "orthodontics":
		case "pediatric":
		case "radiology":
		case "hygiene":
		case "periodontics":
		case "anesthesia":
		case "consultation":
		case "package":
		case "other":
			return category;
		case "prosthetics":
			return "orthopedics";
		case "periodontology":
			return "periodontics";
		case "imaging":
			return "radiology";
		default:
			return "therapy";
	}
}

function toDoctorSpecialty(specialty: string | undefined): DoctorSpecialty {
	switch (specialty) {
		case "therapist":
		case "surgeon":
		case "orthopedist":
		case "orthodontist":
		case "pediatric":
		case "hygienist":
		case "radiologist":
		case "anesthesiologist":
		case "general":
			return specialty;
		case "universal":
			return "general";
		case "periodontist":
			return "therapist";
		case "implantologist":
			return "surgeon";
		default:
			return "therapist";
	}
}

function toMappingConfidenceKind(
	kind: string | undefined,
	hasCode804n: boolean,
): MappingConfidenceKind {
	switch (kind) {
		case "exact_code":
		case "high_keyword":
		case "medium_category":
		case "low_unmatched":
			return kind;
		default:
			return hasCode804n ? "exact_code" : "medium_category";
	}
}

function toSuggestedAction(action: string | undefined): SuggestedAction {
	switch (action) {
		case "create_new":
		case "update_existing":
		case "link_existing":
			return action;
		case "identical":
			return "link_existing";
		default:
			return "create_new";
	}
}

export function buildExistingCatalogReferences(
	catalog: readonly ServiceCatalogItem[],
): readonly ExistingCatalogReference[] {
	return catalog.map((s) => ({
		id: s.id,
		code: s.code || "",
		title: s.title,
		basePriceRub: extractCatalogItemPriceRub(s),
		category: s.category || "",
	}));
}

export function buildModalInitialItems(
	catalog: readonly ServiceCatalogItem[],
): readonly ServicePricelistItem[] {
	if (!catalog || catalog.length === 0) {
		return STATUTORY_ORDER_804N_PRESETS;
	}
	return catalog.map((s) => {
		const basePriceRub = extractCatalogItemPriceRub(s);
		const code804n = (s.code || "").trim() || "A16.07.002";
		const category =
			toPricelistCategory(s.category) ||
			detectCategoryFrom804nCode(code804n, s.title);
		const specialty = toDoctorSpecialty(s.specialty);
		return {
			id: s.id,
			code804n,
			commercialTitle: s.title,
			statutoryTitle804n: s.title,
			category,
			specialty,
			basePriceRub,
			basePriceKopecks: rublesToKopecks(basePriceRub),
			materialCostRub: 0,
			labCostRub: 0,
			estimatedDurationMin: s.durationMinutes || 30,
			vatRate: 0 as const,
			vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
			icd10Indications: [],
			isActive: s.active !== false,
			isArchived: s.active === false,
			tags: s.aliases || [],
		};
	});
}

export function exportCatalogToCsvDownload(catalog: readonly ServiceCatalogItem[]): void {
	const items: ServicePricelistItem[] = catalog.map((s) => {
		const basePriceRub = extractCatalogItemPriceRub(s);
		return {
			id: s.id,
			code804n: s.code || "",
			commercialTitle: s.title,
			statutoryTitle804n: s.title,
			category: toPricelistCategory(s.category),
			specialty: toDoctorSpecialty(s.specialty),
			basePriceRub,
			basePriceKopecks: rublesToKopecks(basePriceRub),
			materialCostRub: 0,
			labCostRub: 0,
			durationMinutes: s.durationMinutes || 30,
			estimatedDurationMin: s.durationMinutes || 30,
			vatRate: 0 as const,
			vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
			icd10Indications: [],
			isActive: s.active !== false,
			isArchived: s.active === false,
			tags: s.aliases || [],
		};
	});

	const blob = new Blob([exportPricelistToCsv(items)], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `dente_pricelist_${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	showToast(`Прейскурант (${items.length} услуг) экспортирован в CSV`, "success");
}

export function printPricelistA4(
	clinicSettings: {
		name?: string;
		address?: string;
		phone?: string;
		license?: string;
		chiefDoctor?: string;
	} | undefined,
	items: readonly ServicePricelistItem[],
): void {
	const printHtml = generatePrintablePricelistHtml(
		{
			clinicName: clinicSettings?.name || "Стоматологическая клиника",
			clinicAddress: clinicSettings?.address || "",
			clinicPhone: clinicSettings?.phone || "",
			clinicLicense: clinicSettings?.license || "",
			chiefDoctorName: clinicSettings?.chiefDoctor || "",
			effectiveDateRu: new Date().toLocaleDateString("ru-RU"),
		},
		items,
	);
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(printHtml);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 250);
	} else {
		showToast("Всплывающее окно печати заблокировано браузером", "error");
	}
}

export async function parseAndImportCsvText(
	text: string,
	onSave: (items: readonly ServicePricelistItem[]) => Promise<void>,
): Promise<number> {
	const result = importPricelistFromCsv(text);
	if (result.invalidRows.length > 0 && result.validItems.length === 0) {
		throw new Error(result.invalidRows[0]?.error || "Неверный формат CSV");
	}
	await onSave(result.validItems);
	return result.validItems.length;
}

export interface ScannedItemPayload {
	readonly id?: string | undefined;
	readonly sourceLineNumber?: number | undefined;
	readonly rowNumber?: number | undefined;
	readonly rawLine?: string | undefined;
	readonly rawInput?: string | undefined;
	readonly cleanedTitle?: string | undefined;
	readonly code804n?: string | undefined;
	readonly statutoryTitle804n?: string | undefined;
	readonly category?: string | undefined;
	readonly specialty?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly confidence?: number | undefined;
	readonly confidenceKind?: string | undefined;
	readonly validationStatus?: string | undefined;
	readonly suggestedAction?: string | undefined;
	readonly matchedExistingServiceId?: string | null | undefined;
	readonly matchedExistingTitle?: string | null | undefined;
	readonly matchedExistingPriceRub?: number | null | undefined;
	readonly isApproved?: boolean | undefined;
}

export function mapScanItemsToDiffItems(
	itemsList: readonly ScannedItemPayload[],
): IngestedMappingItem[] {
	return itemsList.map((it, idx) => {
		const priceRub = Number.isFinite(it.priceRub) ? Number(it.priceRub) : 0;
		const priceKopecks = it.priceKopecks ?? Math.round(priceRub * 100);
		const rawLine = it.rawLine || it.rawInput || it.cleanedTitle || "";
		const cleanedTitle = it.cleanedTitle || rawLine || `Услуга ${idx + 1}`;
		const hasCode = Boolean(it.code804n);

		return {
			id: it.id || `scan-${idx}-${Date.now()}`,
			sourceLineNumber: it.sourceLineNumber || it.rowNumber || idx + 1,
			rawLine,
			cleanedTitle,
			code804n: it.code804n || "A16.07.002",
			statutoryTitle804n: it.statutoryTitle804n || cleanedTitle,
			category: it.category || "therapy",
			specialty: it.specialty || "therapist",
			priceRub,
			priceKopecks,
			confidence: it.confidence ?? (hasCode ? 0.95 : 0.75),
			confidenceKind: toMappingConfidenceKind(it.confidenceKind, hasCode),
			suggestedAction: toSuggestedAction(it.suggestedAction),
			matchedExistingServiceId: it.matchedExistingServiceId ?? undefined,
			matchedExistingTitle: it.matchedExistingTitle ?? undefined,
			matchedExistingPriceRub: it.matchedExistingPriceRub ?? undefined,
			isApproved: it.isApproved ?? it.validationStatus !== "error",
		};
	});
}
