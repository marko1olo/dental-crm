export interface ReceiptItemPayload {
	id: string;
	name: string;
	code804n: string;
	quantity: number;
	priceRub: number;
	discountRub: number;
	amountRub: number;
	toothNumber?: number | undefined;
}

export function buildEnrichedReceiptItems(
	services: readonly any[] | undefined,
	effectiveTooth?: number | undefined,
): ReceiptItemPayload[] {
	return (services || []).map((s: any, idx: number) => {
		const tooth = s.toothNumber ? Number(s.toothNumber) : s.toothCode ? Number(s.toothCode) : effectiveTooth;
		const price = Number(s.unitPriceRub ?? s.priceRub ?? s.price ?? 0);
		const qty = Number(s.quantity ?? 1);
		const total = Number(s.totalRub ?? price * qty);
		return {
			id: s.id || `cs-${idx}`,
			name: s.title || s.name || s.serviceName || "Стоматологическая услуга",
			code804n: s.code804n || s.code || "A16.07.002.001",
			quantity: qty,
			priceRub: price,
			discountRub: Number(s.discountRub ?? 0),
			amountRub: total,
			toothNumber: tooth,
		};
	});
}
