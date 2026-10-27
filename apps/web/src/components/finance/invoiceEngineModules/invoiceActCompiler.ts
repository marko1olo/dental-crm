import { amountToWordsRu, kopecksToNumericString, kopecksToRub, rubToKopecks } from "@dental/shared";
import type { CompletedWorksActParams, CompiledActAndWarrantySummary, WarrantyObligationTerm } from "./invoiceTypes";
import { resolveServiceWarranty } from "./invoiceWarrantyRules";

/**
 * Преобразует сумму в рублях в строку прописью (стандарт бухгалтерских актов РФ).
 * SSOT: делегирует в каноническую реализацию amountToWordsRu из @dental/shared (Мандаты 8b, 8za).
 */
export function numberToWordsRu(amountRub: number, amountKopecks?: number): string {
	const kop = amountKopecks !== undefined
		? Math.abs(amountKopecks)
		: Math.round(Math.abs(amountRub) * 100);
	return amountToWordsRu(kop);
}

/**
 * Compiles completed works act and grouped warranty obligations.
 */
export function compileCompletedWorksAct(params: CompletedWorksActParams): CompiledActAndWarrantySummary {
	let totalGrossKopecks = 0;
	let totalDiscountKopecks = 0;
	let warrantyItemsCount = 0;
	let totalWarrantyKopecks = 0;
	let warrantySourceAppointmentId: string | number | null | undefined = undefined;

	const warrantyGroupMap = new Map<string, { categoryName: string; teeth: Set<string>; warrantyMonths: number; warrantyPeriodText: string; serviceLifeText: string; conditionsText: string }>();

	const validItems = (params.items || []).filter((item) => {
		if (item.isRefund === true || item.isReturned === true) return false;
		if (item.status === "refunded" || item.status === "cancelled" || item.status === "returned") return false;
		return true;
	});

	for (const item of validItems) {
		const unitPriceKop = rubToKopecks(item.priceRub);
		const lineGrossKop = unitPriceKop * item.quantity;
		const isWarranty = !!item.isWarranty;
		const lineDiscKop = isWarranty
			? lineGrossKop
			: (item.discountRub ? rubToKopecks(item.discountRub) : 0);

		totalGrossKopecks += lineGrossKop;
		totalDiscountKopecks += lineDiscKop;

		if (isWarranty) {
			warrantyItemsCount++;
			totalWarrantyKopecks += lineGrossKop;
			if (item.warrantySourceAppointmentId && !warrantySourceAppointmentId) {
				warrantySourceAppointmentId = item.warrantySourceAppointmentId;
			}
		}

		const wInfo = resolveServiceWarranty(item);
		let group = warrantyGroupMap.get(wInfo.categoryName);
		if (!group) {
			group = {
				categoryName: wInfo.categoryName,
				teeth: new Set<string>(),
				warrantyMonths: wInfo.warrantyMonths,
				warrantyPeriodText: wInfo.warrantyPeriodText,
				serviceLifeText: wInfo.serviceLifeText,
				conditionsText: wInfo.conditionsText,
			};
			warrantyGroupMap.set(wInfo.categoryName, group);
		}

		if (item.toothNumber) {
			group.teeth.add(String(item.toothNumber));
		}
	}

	const totalNetKopecks = Math.max(0, totalGrossKopecks - totalDiscountKopecks);

	const warrantyTerms: WarrantyObligationTerm[] = Array.from(warrantyGroupMap.values()).map((g) => ({
		categoryName: g.categoryName,
		teethDisplay: g.teeth.size > 0 ? Array.from(g.teeth).join(", ") : "Область полости рта",
		warrantyMonths: g.warrantyMonths,
		warrantyPeriodText: g.warrantyPeriodText,
		serviceLifeText: g.serviceLifeText,
		conditionsText: g.conditionsText,
	}));

	return {
		actNumber: params.actNumber,
		contractNumber: params.contractNumber,
		items: validItems,
		totalGrossKopecks,
		totalGrossRub: kopecksToRub(totalGrossKopecks),
		totalDiscountKopecks,
		totalDiscountRub: kopecksToRub(totalDiscountKopecks),
		totalNetKopecks,
		totalNetRub: kopecksToRub(totalNetKopecks),
		totalNetRubFormatted: kopecksToNumericString(totalNetKopecks),
		totalInWords: amountToWordsRu(totalNetKopecks),
		warrantyTerms,
		hasWarrantyRework: warrantyItemsCount > 0,
		warrantyItemsCount,
		totalWarrantyPriceRub: kopecksToRub(totalWarrantyKopecks),
		warrantySourceAppointmentId,
	};
}
