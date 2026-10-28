import type { AdvertisingChannelMetric } from "./romiTypes.js";

export function rankChannelsByMargin(
	channels: readonly AdvertisingChannelMetric[],
): AdvertisingChannelMetric[] {
	return [...channels].sort((a, b) => b.profitKopecks - a.profitKopecks);
}

export function rankChannelsByRomi(
	channels: readonly AdvertisingChannelMetric[],
): AdvertisingChannelMetric[] {
	return [...channels].sort((a, b) => {
		const romiA = a.romiPercent ?? (a.romiStatus === "organic" ? 999999 : -999999);
		const romiB = b.romiPercent ?? (b.romiStatus === "organic" ? 999999 : -999999);
		return romiB - romiA;
	});
}

export function rankChannelsByRevenue(
	channels: readonly AdvertisingChannelMetric[],
): AdvertisingChannelMetric[] {
	return [...channels].sort((a, b) => b.revenueKopecks - a.revenueKopecks);
}

export function findTopChannelByRevenue(
	channels: readonly AdvertisingChannelMetric[],
): string | null {
	let maxRev = -1;
	let topName: string | null = null;
	for (const ch of channels) {
		if (ch.revenueKopecks > maxRev && ch.revenueKopecks > 0) {
			maxRev = ch.revenueKopecks;
			topName = ch.nameRu;
		}
	}
	return topName;
}
