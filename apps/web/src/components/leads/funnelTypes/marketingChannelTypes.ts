/**
 * DENTE Dental CRM — Leads Marketing Channels Types
 * Mandate 8b (<= 120 lines)
 */

export type CanonicalMarketingChannelKey =
	| "yandex_direct"
	| "gis_2"
	| "prodoctorov"
	| "napopravku"
	| "site_seo"
	| "recommendations"
	| "social_media"
	| "avito"
	| "yandex_maps"
	| "max"
	| "other";

export {
	type MarketingChannelMeta,
	MARKETING_CHANNELS,
	LEAD_DROP_REASONS,
	type LeadDropReason,
} from "./marketingChannelData";

export { normalizeMarketingChannel } from "./marketingChannelNormalizer";

import { MARKETING_CHANNELS } from "./marketingChannelData";

export function getMarketingChannelLabel(
	channelKey: CanonicalMarketingChannelKey,
): string {
	const match = MARKETING_CHANNELS.find((c) => c.key === channelKey);
	return match ? match.label : "Прочие";
}
