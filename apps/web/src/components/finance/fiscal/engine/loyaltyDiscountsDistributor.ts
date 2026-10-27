/**
 * loyaltyDiscountsDistributor.ts — Largest Remainder Discount Distribution (Hamilton-Hare method).
 * Mandate 8b: <= 120 lines. Exact integer kopecks arithmetic.
 */
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { DistributedDiscountResult, LoyaltyDiscountParams } from "../engine54fz/types";
import { calculatePresetKopecks } from "./calculatePresetKopecks";

export function distributeLoyaltyDiscountAcrossItems<T extends {
	readonly id: string; readonly name: string; readonly quantity: number; readonly priceRub: number;
	readonly discountRub?: number | undefined; readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined; readonly warrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
}>(items: readonly T[], params: LoyaltyDiscountParams): DistributedDiscountResult<T> {
	if (items.length === 0) {
		return {
			items: [], totalGrossKopecks: 0, totalGrossRub: 0, totalDiscountKopecks: 0, totalDiscountRub: 0,
			totalNetKopecks: 0, totalNetRub: 0, effectivePercent: 0, savingsText: "Экономия: 0,00 ₽",
			isCapped: false, hasWarrantyRework: false, warrantyItemsCount: 0, totalWarrantyPriceRub: 0,
		};
	}

	let [totalGrossKop, nonWarrantyGrossKop, warrantyKop, warrantyItemsCount] = [0, 0, 0, 0];
	const itemGrossKopecksList: number[] = [];

	for (const item of items) {
		const qty = Math.max(1, Math.round(item.quantity || 1));
		const lineGrossKop = Math.max(0, rubToKopecks(item.priceRub)) * qty;
		itemGrossKopecksList.push(lineGrossKop);
		totalGrossKop += lineGrossKop;
		if (item.isWarranty) { warrantyKop += lineGrossKop; warrantyItemsCount++; }
		else { nonWarrantyGrossKop += lineGrossKop; }
	}

	const { targetLoyaltyDiscountKopecks, isCapped } = calculatePresetKopecks(params, nonWarrantyGrossKop);
	const itemLineDiscountKopecks: number[] = new Array(items.length).fill(0);
	let allocatedKopecks = 0;

	for (let i = 0; i < items.length; i++) {
		if (items[i]!.isWarranty) {
			itemLineDiscountKopecks[i] = itemGrossKopecksList[i]!;
		} else if (nonWarrantyGrossKop > 0 && targetLoyaltyDiscountKopecks > 0) {
			const baseLineKop = Math.floor((itemGrossKopecksList[i]! * targetLoyaltyDiscountKopecks) / nonWarrantyGrossKop);
			itemLineDiscountKopecks[i] = baseLineKop;
			allocatedKopecks += baseLineKop;
		}
	}

	const remainderKopecks = targetLoyaltyDiscountKopecks - allocatedKopecks;
	if (remainderKopecks > 0 && nonWarrantyGrossKop > 0) {
		const remainders = items
			.map((it, i) => (!it.isWarranty ? {
				index: i,
				rem: ((itemGrossKopecksList[i]! * targetLoyaltyDiscountKopecks) % nonWarrantyGrossKop) / nonWarrantyGrossKop,
				gross: itemGrossKopecksList[i]!,
			} : null))
			.filter((x): x is NonNullable<typeof x> => x !== null)
			.sort((a, b) => b.rem - a.rem || b.gross - a.gross);

		for (let r = 0; r < remainderKopecks && r < remainders.length; r++) {
			itemLineDiscountKopecks[remainders[r]!.index]! += 1;
		}
	}

	const updatedItems: T[] = items.map((it, idx) => {
		const qty = Math.max(1, Math.round(it.quantity || 1));
		if (it.isWarranty) {
			return { ...it, discountRub: it.priceRub * qty, isWarranty: true, warrantyDiscountPercent: 100, warrantyPriceRub: kopecksToRub(itemGrossKopecksList[idx]!), warrantySourceAppointmentId: it.warrantySourceAppointmentId ?? null };
		}
		return { ...it, discountRub: kopecksToRub(Math.round(itemLineDiscountKopecks[idx]! / qty)) };
	});

	const totalDiscountKopecks = warrantyKop + targetLoyaltyDiscountKopecks;
	const totalNetKopecks = Math.max(0, totalGrossKop - totalDiscountKopecks);
	const totalDiscountRub = kopecksToRub(totalDiscountKopecks);
	const effectivePercent = totalGrossKop > 0 ? Math.round((totalDiscountKopecks / totalGrossKop) * 1000) / 10 : 0;
	const savingsFormatted = totalDiscountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const savingsText = params.preset === "round_hundreds" ? `Округление до сотен: скидка ${savingsFormatted} ₽` : `Экономия для пациента: ${savingsFormatted} ₽`;

	return {
		items: updatedItems, totalGrossKopecks: totalGrossKop, totalGrossRub: kopecksToRub(totalGrossKop),
		totalDiscountKopecks, totalDiscountRub, totalNetKopecks, totalNetRub: kopecksToRub(totalNetKopecks),
		effectivePercent, savingsText, isCapped, hasWarrantyRework: warrantyItemsCount > 0,
		warrantyItemsCount, totalWarrantyPriceRub: kopecksToRub(warrantyKop),
	};
}
