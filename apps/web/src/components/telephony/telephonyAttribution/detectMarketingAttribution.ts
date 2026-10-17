export interface MarketingAttributionResult {
	channel: string;
	channelLabel: string;
}

export function detectMarketingAttribution(params: {
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	targetRaw?: string | undefined;
}): MarketingAttributionResult {
	let detectedChannel = "telephony";
	let detectedLabel = "Прямой звонок / ВАТС";

	const utmRaw = `${params.utm_source || ""} ${params.utm_campaign || ""} ${params.utm_medium || ""}`
		.trim()
		.toLowerCase();

	if (utmRaw) {
		if (/avito|авито/i.test(utmRaw)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(utmRaw)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(utmRaw)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/yandex|direct|директ|рся|rsya/i.test(utmRaw)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|gis|2гис|дубльгис/i.test(utmRaw)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoctorov|продокторов/i.test(utmRaw)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopravku|напоправку/i.test(utmRaw)) {
			detectedChannel = "napopravku";
			detectedLabel = "НаПоправку";
		} else if (/site|сайт|seo|сео|органика|organic|google/i.test(utmRaw)) {
			detectedChannel = "site_seo";
			detectedLabel = "Сайт / SEO";
		} else if (/vk|vkontakte|telegram|tg|вк|инста|instagram/i.test(utmRaw)) {
			detectedChannel = "social_media";
			detectedLabel = "Соцсети (VK / TG)";
		}
	}

	if (detectedChannel === "telephony" && params.advertising_channel) {
		const ch = params.advertising_channel.trim().toLowerCase();
		if (/avito|авито/i.test(ch)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(ch)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(ch)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/direct|яндекс|yandex/i.test(ch)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(ch)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc/i.test(ch)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopr/i.test(ch)) {
			detectedChannel = "napopravku";
			detectedLabel = "НаПоправку";
		} else if (/site|seo|сайт/i.test(ch)) {
			detectedChannel = "site_seo";
			detectedLabel = "Сайт / SEO";
		} else {
			detectedChannel = ch;
			detectedLabel = ch;
		}
	}

	if (detectedChannel === "telephony" && params.targetRaw) {
		const trLower = params.targetRaw.toLowerCase();
		if (/avito|авито/i.test(trLower)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(trLower)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(trLower)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/direct|yandex|директ/i.test(trLower)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(trLower)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc/i.test(trLower)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		}
	}

	return {
		channel: detectedChannel,
		channelLabel: detectedLabel,
	};
}
