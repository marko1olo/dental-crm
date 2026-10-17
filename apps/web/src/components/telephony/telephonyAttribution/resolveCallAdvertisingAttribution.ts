import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import { formatPhoneDisplay } from "../../../store/telephonyHelpers";
import {
	type CanonicalMarketingChannelKey,
	normalizeMarketingChannel,
} from "../../leads/leadsFunnelTypes";
import {
	type CallAttribution,
	CHANNEL_DISPLAY_NAMES,
} from "./attributionConstants";

export function resolveCallAdvertisingAttribution(
	call: IncomingCallPayload,
	clinicVirtualTrunkMap?: Record<string, string>,
): CallAttribution {
	let channelKey: CanonicalMarketingChannelKey = "other";

	const utmSource = (call.utmSource || "").trim().toLowerCase();
	const utmCampaign = (call.utmCampaign || "").trim().toLowerCase();
	const utmMedium = (call.utmMedium || "").trim().toLowerCase();

	if (utmSource || utmCampaign) {
		const combined = `${utmSource} ${utmCampaign} ${utmMedium}`;
		if (/yandex|direct|директ|рся|rsya/i.test(combined)) channelKey = "yandex_direct";
		else if (/2gis|gis|2гис|дубльгис/i.test(combined)) channelKey = "gis_2";
		else if (/prodoctorov|продокторов/i.test(combined)) channelKey = "prodoctorov";
		else if (/napopravku|напоправку/i.test(combined)) channelKey = "napopravku";
		else if (/site|сайт|seo|сео|органика|organic|google/i.test(combined)) channelKey = "site_seo";
		else if (/vk|vkontakte|telegram|tg|вк|инста|instagram/i.test(combined)) channelKey = "social_media";
		else if (/rec|сарафан|рекомендаци|friend/i.test(combined)) channelKey = "recommendations";
	}

	if (channelKey === "other" && call.advertisingChannel) {
		channelKey = normalizeMarketingChannel(call.advertisingChannel);
	}

	const rawTrunk = (call.virtualNumber || call.calledDid || call.clinicPhone || "").trim();

	if (channelKey === "other" && rawTrunk) {
		if (clinicVirtualTrunkMap && rawTrunk in clinicVirtualTrunkMap) {
			channelKey = normalizeMarketingChannel(clinicVirtualTrunkMap[rawTrunk]);
		} else {
			const trunkLower = rawTrunk.toLowerCase();
			if (/yandex|direct|директ/i.test(trunkLower)) channelKey = "yandex_direct";
			else if (/2gis|2гис|gis/i.test(trunkLower)) channelKey = "gis_2";
			else if (/prodoc|продокт/i.test(trunkLower)) channelKey = "prodoctorov";
			else if (/napopr|напопр/i.test(trunkLower)) channelKey = "napopravku";
			else if (/seo|site|сайт/i.test(trunkLower)) channelKey = "site_seo";
			else if (/vk|tg|social/i.test(trunkLower)) channelKey = "social_media";
		}
	}

	const channelLabel = CHANNEL_DISPLAY_NAMES[channelKey] || "Прямой звонок";
	const virtualNumberDisplay = rawTrunk ? formatPhoneDisplay(rawTrunk) : "";

	const providerLabel =
		call.provider === "mango"
			? "Mango Telecom"
			: call.provider === "uis"
				? "UIS / CoMagic"
				: call.provider === "asterisk"
					? "Asterisk SIP"
					: call.provider === "zadarma"
						? "Zadarma PBX"
						: "ВАТС";

	const utmParts: string[] = [];
	if (call.utmSource) utmParts.push(`source: ${call.utmSource}`);
	if (call.utmCampaign) utmParts.push(`campaign: ${call.utmCampaign}`);
	if (call.utmMedium) utmParts.push(`medium: ${call.utmMedium}`);
	if (call.utmContent) utmParts.push(`content: ${call.utmContent}`);
	const utmSummary = utmParts.join(" | ");

	const notesPayload = [
		`Входящий звонок через ВАТС (${providerLabel}).`,
		virtualNumberDisplay ? `Номер ВАТС: ${virtualNumberDisplay}.` : null,
		`Рекламный канал: ${channelLabel}.`,
		utmSummary ? `UTM-метки: [${utmSummary}].` : null,
		call.callId ? `ID звонка АТС: ${call.callId}.` : null,
	]
		.filter(Boolean)
		.join(" ");

	return {
		channelKey,
		channelLabel,
		virtualNumberDisplay,
		providerLabel,
		utmSource: call.utmSource,
		utmCampaign: call.utmCampaign,
		utmMedium: call.utmMedium,
		utmSummary,
		notesPayload,
	};
}
