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
import type { ExistingCatalogReference } from "../../pricing/PriceListMappingDiffView";

export function buildExistingCatalogReferences(
	catalog: readonly ServiceCatalogItem[],
): readonly ExistingCatalogReference[] {
	return catalog.map((s) => {
		const rawPrice =
			s.basePriceRub ??
			(s as unknown as { priceRub?: number }).priceRub ??
			((s as unknown as { priceKopecks?: number }).priceKopecks
				? (s as unknown as { priceKopecks: number }).priceKopecks / 100
				: 0);
		const basePriceRub = Number.isFinite(rawPrice)
			? Math.round(rawPrice * 100) / 100
			: 0;
		return {
			id: s.id,
			code: s.code || "",
			title: s.title,
			basePriceRub,
		};
	});
}

export function buildModalInitialItems(
	catalog: readonly ServiceCatalogItem[],
): readonly ServicePricelistItem[] {
	if (!catalog || catalog.length === 0) {
		return STATUTORY_ORDER_804N_PRESETS;
	}
	return catalog.map((s) => {
		const rawPrice =
			s.basePriceRub ??
			(s as unknown as { priceRub?: number }).priceRub ??
			((s as unknown as { priceKopecks?: number }).priceKopecks
				? (s as unknown as { priceKopecks: number }).priceKopecks / 100
				: 0);
		const basePriceRub = Number.isFinite(rawPrice)
			? Math.round(rawPrice * 100) / 100
			: 0;
		const code804n = (s.code || "").trim() || "A16.07.002";
		const category =
			(s.category as Order804nCategory) ||
			detectCategoryFrom804nCode(code804n, s.title);
		const specialty = (s.specialty as DoctorSpecialty) || "therapist";
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
		const raw =
			s.basePriceRub ??
			(s as any).priceRub ??
			((s as any).priceKopecks ? (s as any).priceKopecks / 100 : 0);
		const basePriceRub = Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
		return {
			id: s.id,
			code804n: s.code || "",
			commercialTitle: s.title,
			statutoryTitle804n: s.title,
			// biome-ignore lint/suspicious/noExplicitAny: category cast
			category: (s.category || "therapy") as any,
			// biome-ignore lint/suspicious/noExplicitAny: specialty cast
			specialty: (s.specialty || "therapist") as any,
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
		items as any,
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

export function mapScanItemsToDiffItems(
	// biome-ignore lint/suspicious/noExplicitAny: scanner response payload
	itemsList: any[],
): import("../../pricing/PriceListMappingDiffView").IngestedMappingItem[] {
	return itemsList.map((it: any, idx: number) => ({
		id: it.id || `scan-${idx}-${Date.now()}`,
		sourceLineNumber: it.sourceLineNumber || idx + 1,
		rawLine: it.rawLine || it.cleanedTitle,
		cleanedTitle: it.cleanedTitle,
		code804n: it.code804n || "A16.07.002",
		statutoryTitle804n: it.statutoryTitle804n || it.cleanedTitle,
		category: it.category || "therapy",
		specialty: it.specialty || "therapist",
		priceRub: it.priceRub,
		priceKopecks: it.priceKopecks ?? Math.round(it.priceRub * 100),
		confidence: it.confidence ?? (it.code804n ? 0.95 : 0.75),
		confidenceKind:
			it.confidenceKind ?? (it.code804n ? "exact_code" : "medium_keyword"),
		suggestedAction: it.suggestedAction || "create_new",
		matchedExistingServiceId: it.matchedExistingServiceId,
		matchedExistingTitle: it.matchedExistingTitle,
		matchedExistingPriceRub: it.matchedExistingPriceRub,
		isApproved: it.isApproved ?? it.validationStatus !== "error",
	}));
}
