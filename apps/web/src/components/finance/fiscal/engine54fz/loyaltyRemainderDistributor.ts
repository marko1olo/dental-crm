export function distributeRemainderKopecks(
	remainderKopecks: number,
	nonWarrantyGrossKopecks: number,
	targetLoyaltyDiscountKopecks: number,
	itemGrossKopecksList: readonly number[],
	itemLineDiscountKopecks: number[],
	isWarrantyFlags: readonly boolean[],
): void {
	if (remainderKopecks <= 0 || nonWarrantyGrossKopecks <= 0) return;

	const nonWarrantyIndices = isWarrantyFlags
		.map((w, idx) => (w ? -1 : idx))
		.filter((i) => i >= 0);

	const remainders = nonWarrantyIndices
		.map((i) => ({
			index: i,
			remainder: ((itemGrossKopecksList[i]! * targetLoyaltyDiscountKopecks) % nonWarrantyGrossKopecks) / nonWarrantyGrossKopecks,
			gross: itemGrossKopecksList[i]!,
		}))
		.sort((a, b) => b.remainder - a.remainder || b.gross - a.gross);

	for (let r = 0; r < remainderKopecks && r < remainders.length; r++) {
		itemLineDiscountKopecks[remainders[r]!.index]! += 1;
	}
}
