import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { DistributedDiscountResult, LoyaltyDiscountParams } from "./types";
import { calculateTargetLoyaltyDiscountKopecks } from "./loyaltyPresetCalculator";
import { distributeRemainderKopecks } from "./loyaltyRemainderDistributor";
import { createZeroDiscountResult } from "./loyaltyZeroResult";

export function distributeLoyaltyDiscountAcrossItems<T extends {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
}>(items: readonly T[], params: LoyaltyDiscountParams): DistributedDiscountResult<T> {
	if (items.length === 0) {
		return createZeroDiscountResult(items);
	}

	let totalGrossKopecks = 0;
	let nonWarrantyGrossKopecks = 0;
	let warrantyKopecks = 0;
	let warrantyItemsCount = 0;
	const itemGrossKopecksList: number[] = [];

	for (const item of items) {
		const qty = Math.max(1, Math.round(item.quantity || 1));
		const lineGrossKop = Math.max(0, rubToKopecks(item.priceRub)) * qty;
		itemGrossKopecksList.push(lineGrossKop);
		totalGrossKopecks += lineGrossKop;
		if (item.isWarranty) {
			warrantyKopecks += lineGrossKop;
			warrantyItemsCount++;
		} else {
			nonWarrantyGrossKopecks += lineGrossKop;
		}
	}

	const hasWarranty = warrantyItemsCount > 0;
	if (totalGrossKopecks <= 0) {
		return createZeroDiscountResult(items, totalGrossKopecks);
	}

	const { targetLoyaltyDiscountKopecks, isCapped } = calculateTargetLoyaltyDiscountKopecks(nonWarrantyGrossKopecks, params);
	const itemLineDiscountKopecks: number[] = new Array(items.length).fill(0);
	let allocatedKopecks = 0;

	for (let i = 0; i < items.length; i++) {
		if (items[i]!.isWarranty) {
			itemLineDiscountKopecks[i] = itemGrossKopecksList[i]!;
		} else if (nonWarrantyGrossKopecks > 0 && targetLoyaltyDiscountKopecks > 0) {
			const baseLineDiscountKop = Math.floor((itemGrossKopecksList[i]! * targetLoyaltyDiscountKopecks) / nonWarrantyGrossKopecks);
			itemLineDiscountKopecks[i] = baseLineDiscountKop;
			allocatedKopecks += baseLineDiscountKop;
		}
	}

	const remainderKopecks = targetLoyaltyDiscountKopecks - allocatedKopecks;
	distributeRemainderKopecks(
		remainderKopecks,
		nonWarrantyGrossKopecks,
		targetLoyaltyDiscountKopecks,
		itemGrossKopecksList,
		itemLineDiscountKopecks,
		items.map((it) => !!it.isWarranty),
	);

	const updatedItems: T[] = items.map((it, idx) => {
		const qty = Math.max(1, Math.round(it.quantity || 1));
		if (it.isWarranty) {
			return {
				...it,
				discountRub: it.priceRub * qty,
				isWarranty: true,
				warrantyDiscountPercent: 100,
				warrantyPriceRub: kopecksToRub(itemGrossKopecksList[idx]!),
				warrantySourceAppointmentId: it.warrantySourceAppointmentId ?? null,
			};
		}
		return { ...it, discountRub: kopecksToRub(Math.round(itemLineDiscountKopecks[idx]! / qty)) };
	});

	const totalDiscountKopecks = warrantyKopecks + targetLoyaltyDiscountKopecks;
	const totalNetKopecks = Math.max(0, totalGrossKopecks - totalDiscountKopecks);
	const totalDiscountRub = kopecksToRub(totalDiscountKopecks);
	const effectivePercent = totalGrossKopecks > 0 ? Math.round((totalDiscountKopecks / totalGrossKopecks) * 1000) / 10 : 0;
	const savingsFormatted = totalDiscountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const savingsText = params.preset === "round_hundreds"
		? `Округление до сотен: скидка ${savingsFormatted} ₽`
		: hasWarranty && totalDiscountRub > 0
			? `Гарантия и скидки: экономия ${savingsFormatted} ₽`
			: `Экономия для пациента: ${savingsFormatted} ₽`;

	return {
		items: updatedItems,
		totalGrossKopecks,
		totalGrossRub: kopecksToRub(totalGrossKopecks),
		totalDiscountKopecks,
		totalDiscountRub,
		totalNetKopecks,
		totalNetRub: kopecksToRub(totalNetKopecks),
		effectivePercent,
		savingsText,
		isCapped,
		hasWarrantyRework: hasWarranty,
		warrantyItemsCount,
		totalWarrantyPriceRub: kopecksToRub(warrantyKopecks),
	};
}
