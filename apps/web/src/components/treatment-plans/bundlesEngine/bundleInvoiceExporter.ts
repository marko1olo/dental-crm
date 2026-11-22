import { type Kopecks, parseKopecks, percentageOfKopecks, kopecksToRubles } from "@dental/shared";
import type { InvoiceServiceItem } from "../../finance/invoiceEngine";
import type { ClinicalBundleId } from "../treatmentPlanBundlesPresets";
import type { CashierInvoiceExportData } from "../types";
import {
	type CreateBundlePlanItemsOptions,
	createBundlePlanItems,
} from "./bundlePlanItemsBuilder";
import { calculateBundlePrice } from "./bundlePriceCalculator";
import { getClinicalBundleById } from "./bundleRegistry";

export function createBundleInvoiceItems(
	bundleId: ClinicalBundleId,
	options: CreateBundlePlanItemsOptions = {},
): InvoiceServiceItem[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const { toothNumber, selectedItemIds, customPriceMap } = options;
	const effectiveTooth = bundle.requiresTooth
		? toothNumber && toothNumber > 0
			? toothNumber
			: bundle.defaultTooth
		: undefined;

	const breakdown = calculateBundlePrice(bundleId, selectedItemIds);
	const now = Date.now();

	return breakdown.selectedItems.map((item, idx) => {
		const customPrice = customPriceMap?.[item.id];
		const priceRub =
			typeof customPrice === "number"
				? Math.max(0, customPrice)
				: item.defaultPriceRub;

		const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";

		const mappedCategory: InvoiceServiceItem["category"] =
			bundle.category === "therapy"
				? "therapy"
				: bundle.category === "surgery"
					? "surgery"
					: bundle.category === "hygiene"
						? "hygiene"
						: "orthopedics";

		return {
			id: `inv-item-${bundle.id}-${effectiveTooth ?? "0"}-${now}-${idx + 1}`,
			name: `${toothPrefix}${item.name}`,
			code804n: item.code804n,
			toothNumber: effectiveTooth,
			quantity: 1,
			priceRub,
			discountRub: 0,
			category: mappedCategory,
		};
	});
}

export interface CreateBundleInvoiceExportOptions extends CreateBundlePlanItemsOptions {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly discountPercent?: number | undefined;
	readonly notes?: string | undefined;
}

export function createBundleInvoiceExport(
	bundleId: ClinicalBundleId,
	options: CreateBundleInvoiceExportOptions = {},
): CashierInvoiceExportData {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const planItems = createBundlePlanItems(bundleId, options);
	const grossTotalRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
	const grossKopecks = parseKopecks(grossTotalRub);
	const discountPercent = Math.max(0, Math.min(100, options.discountPercent ?? 0));
	const discountKopecks =
		discountPercent > 0
			? percentageOfKopecks(grossKopecks, discountPercent * 100)
			: (0 as Kopecks);
	const discountRub = Math.round(kopecksToRubles(discountKopecks));
	const netTotalKopecks = Math.max(0, grossKopecks - discountKopecks) as Kopecks;
	const netTotalRub = Math.round(kopecksToRubles(netTotalKopecks));

	const toothNote = bundle.requiresTooth
		? ` (Зуб ${options.toothNumber ?? bundle.defaultTooth})`
		: "";

	return {
		patientId: options.patientId ?? "patient-walkin",
		patientName: options.patientName ?? "Пациент",
		invoiceId: `inv-chairside-${bundleId}-${Date.now()}`,
		invoiceNumber: `ПАКЕТ-${Date.now().toString().slice(-6)}`,
		items: planItems,
		grossTotalRub,
		discountRub,
		bonusPointsUsedRub: 0,
		bonusPointsUsedKopecks: 0 as Kopecks,
		netTotalRub,
		netTotalKopecks,
		notes: options.notes ?? `Клинический пакет «${bundle.shortTitle}»${toothNote}`,
		createdAtIso: new Date().toISOString(),
	};
}
