import { type Kopecks, parseKopecks } from "@dental/shared";
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
		const priceRub =
			customPriceMap && customPriceMap[item.id] !== undefined
				? Math.max(0, customPriceMap[item.id]!)
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
	const discountPercent = Math.max(0, Math.min(100, options.discountPercent ?? 0));
	const discountRub = Math.round((grossTotalRub * discountPercent) / 100);
	const netTotalRub = Math.max(0, grossTotalRub - discountRub);
	const netTotalKopecks = parseKopecks(netTotalRub);

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
