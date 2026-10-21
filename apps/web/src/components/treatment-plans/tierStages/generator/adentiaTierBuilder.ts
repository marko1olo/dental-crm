import type { TierGeneratorContext } from "./types";
import { handleTotalAdentia } from "./totalAdentiaBuilder";
import { handleEconomyAdentiaSpan } from "./economyAdentiaSpanBuilder";
import { handleOptimumAdentiaSpan } from "./optimumAdentiaSpanBuilder";

export function processTierMissingTeeth(
	jawSeq: readonly number[],
	missingList: number[],
	jawLabel: "верхней" | "нижней",
	ctx: TierGeneratorContext,
): void {
	const missingSet = new Set(missingList);
	if (missingSet.size === 0) return;

	if (missingSet.size > 10) {
		handleTotalAdentia(jawLabel, ctx);
		return;
	}

	const handled = new Set<number>();
	let i = 0;
	while (i < jawSeq.length) {
		const tNum = jawSeq[i]!;
		if (missingSet.has(tNum) && !handled.has(tNum)) {
			const currentSpan: number[] = [tNum];
			let j = i + 1;
			while (j < jawSeq.length && missingSet.has(jawSeq[j]!) && !handled.has(jawSeq[j]!)) {
				currentSpan.push(jawSeq[j]!);
				j++;
			}

			if (ctx.tierId === "economy") {
				handleEconomyAdentiaSpan(currentSpan, handled, ctx);
			} else {
				handleOptimumAdentiaSpan(currentSpan, handled, ctx);
			}
			i = j;
			continue;
		}
		i++;
	}
}
