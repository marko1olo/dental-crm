import {
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12VatRate,
	type Kopecks,
	calculateVatKopecks,
	isRetailCommodityItem,
	kopecksToRubles,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { TREATMENT_STAGE_LABELS, type Order804nFiscalReceiptItem } from "./types";
import { formatFiscalItemName, resolveTaxDeductionCategory } from "./taxAndMathHelpers";

export function mapTreatmentItemsToFiscalReceipt(
	items: readonly (TreatmentPlanItem | Order804nFiscalReceiptItem)[],
	paymentMethod: Ffd12PaymentMethod = "full_payment",
) {
	const resultItems: Order804nFiscalReceiptItem[] = [];
	let vat20Kopecks = 0 as Kopecks;
	let vatNoneKopecks = 0 as Kopecks;
	let retailTotalKopecks = 0 as Kopecks;
	let medicalTotalKopecks = 0 as Kopecks;

	for (const it of items) {
		const qty = Math.max(1, it.quantity || 1);
		const unitPriceRub = it.unitPriceRub || it.priceRub || 0;
		const grossAmountKopecks = multiplyKopecks(parseKopecks(unitPriceRub), qty);
		const netAmountKopecks = Math.max(0, grossAmountKopecks - parseKopecks(it.discountRub || 0)) as Kopecks;
		const isRetail = isRetailCommodityItem({
			name: it.name, category: it.category, paymentSubject: it.paymentSubject, vatRate: it.vatRate, isRetail: it.isRetail,
		});
		const isMarked = isMarkedCommodity(it.name, it.materials);
		const taxCat = isRetail ? "1" : resolveTaxDeductionCategory(it.code804n, it.name);

		let vatRate: Ffd12VatRate;
		let taxRateKopecks: Kopecks;
		let paymentSubject: Ffd12PaymentSubject;

		if (isRetail) {
			vatRate = it.vatRate || "vat_20";
			paymentSubject = it.paymentSubject || (it.category === "certificates" ? "payment" : "commodity");
			taxRateKopecks = vatRate === "vat_none" ? (0 as Kopecks) : (calculateVatKopecks(netAmountKopecks, "vat_20") as Kopecks);
			retailTotalKopecks = (retailTotalKopecks + netAmountKopecks) as Kopecks;
			if (vatRate === "vat_20") vat20Kopecks = (vat20Kopecks + taxRateKopecks) as Kopecks;
			else vatNoneKopecks = (vatNoneKopecks + netAmountKopecks) as Kopecks;
		} else {
			vatRate = "vat_none";
			taxRateKopecks = 0 as Kopecks;
			paymentSubject = isMarked ? "goods_with_marking" : "service";
			medicalTotalKopecks = (medicalTotalKopecks + netAmountKopecks) as Kopecks;
			vatNoneKopecks = (vatNoneKopecks + netAmountKopecks) as Kopecks;
		}

		resultItems.push({
			id: it.id, name: formatFiscalItemName(it.name, it.code804n, it.toothNumber),
			code804n: it.code804n || (isRetail ? "RETAIL" : "A16.07.002"),
			...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
			quantity: qty, unitPriceRub, unitPriceKopecks: parseKopecks(unitPriceRub),
			discountRub: it.discountRub || 0, discountKopecks: parseKopecks(it.discountRub || 0),
			grossRub: kopecksToRubles(grossAmountKopecks), grossKopecks: grossAmountKopecks,
			amountRub: kopecksToRubles(netAmountKopecks), amountKopecks: netAmountKopecks,
			vatRate, taxRateKopecks, paymentSubject, paymentMethod, quantityMeasure: "piece",
			taxDeductionCategory: taxCat, stageKind: it.stageKind,
			stageCategoryTitle: (it.stageKind ? TREATMENT_STAGE_LABELS[it.stageKind] : undefined) || it.category || (isRetail ? "Витрина ресепшена (гигиена)" : "Стоматологическое лечение"),
			isMarkedItem: isMarked, matchedTradeName: isMarked ? it.name : undefined, isRetail, barcode: it.barcode, sku: it.sku,
		});
	}

	const totalKopecks = sumKopecks(resultItems.map((i) => i.amountKopecks));
	const grossKopecks = sumKopecks(resultItems.map((i) => i.grossKopecks));
	const hasExpensiveTreatment = resultItems.some((i) => !i.isRetail && i.taxDeductionCategory === "2");

	return {
		items: resultItems, totalKopecks, totalRub: kopecksToRubles(totalKopecks),
		grossKopecks, grossRub: kopecksToRubles(grossKopecks),
		taxRateKopecks: sumKopecks(resultItems.map((i) => i.taxRateKopecks)),
		vat20Kopecks, vat20Rub: kopecksToRubles(vat20Kopecks), vatNoneKopecks, vatNoneRub: kopecksToRubles(vatNoneKopecks),
		hasMixedItems: vat20Kopecks > 0 && vatNoneKopecks > 0, retailTotalKopecks, medicalTotalKopecks,
		hasExpensiveTreatment, taxDeductionSummaryCode: (hasExpensiveTreatment ? "2" : "1") as "1" | "2",
	};
}

function isMarkedCommodity(name?: string, materials?: string): boolean {
	const text = `${name || ""} ${materials || ""}`.toLowerCase();
	return text.includes("импланта") || text.includes("имплантат") || text.includes("анестези") ||
		text.includes("ультракаин") || text.includes("септанест") || text.includes("убистезин") ||
		text.includes("bio-oss") || text.includes("анестетик");
}
