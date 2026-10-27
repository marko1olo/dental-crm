import { kopecksToRub, rubToKopecks } from "@dental/shared";

export function balanceSplitTenders(
	totalDueRub: number,
	effectiveCashRub: number,
	effectiveCardRub: number,
	otherKop: number,
) {
	const totalDueKop = rubToKopecks(totalDueRub);
	const remainderKop = Math.max(0, totalDueKop - otherKop);
	if (effectiveCashRub > 0 && effectiveCardRub === 0) {
		return { cashRub: kopecksToRub(remainderKop), cardRub: 0 };
	}
	const cashKop = rubToKopecks(effectiveCashRub);
	return { cashRub: effectiveCashRub, cardRub: kopecksToRub(Math.max(0, remainderKop - cashKop)) };
}

export function determineSplitPrimaryMethod(
	isSplitPayment: boolean,
	dmsKop: number,
	cashRub: number,
	cardRub: number,
	sbpRub: number,
	depositRub: number,
): string {
	if (isSplitPayment) return "split";
	if (dmsKop > 0) return "insurance";
	if (cashRub > 0 && cardRub === 0 && sbpRub === 0) return "cash";
	if (depositRub > 0 && cashRub === 0 && cardRub === 0 && sbpRub === 0) return "family_wallet";
	if (sbpRub > 0 && cashRub === 0 && cardRub === 0) return "online";
	return "card";
}
