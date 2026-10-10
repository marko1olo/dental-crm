/**
 * telephonyAttribution.ts — CRM Telephony Inbound Lead Capture & Marketing Channel Attribution
 *
 * Движок 1-клик захвата входящих звонков в CRM-лиды с автоматической разметкой
 * рекламных каналов (UTM-метки, подменные номера коллтрекинга / транки виртуальной АТС).
 *
 * Согласовано с:
 * - leadsFunnelTypes.ts (Канонические маркетинговые каналы РФ: Яндекс.Директ, 2ГИС, ПроДокторов, НаПоправку, SEO)
 * - Mandate 8e & 8n (Автономия врача и администратора: захват в 1 клик без обязательного ассистента или филиала)
 * - Miller's Law (Strictly <= 2 primary direct buttons on call surfaces)
 */

import {
	type CanonicalMarketingChannelKey,
	normalizeMarketingChannel,
} from "../leads/leadsFunnelTypes";
import type { IncomingCallPayload } from "../../store/telephonyTypes";
import { formatPhoneDisplay } from "../../store/telephonyHelpers";
import { useTelephonyStore } from "../../store/telephonyStore";
import { useLeadsStore } from "../../store/leadsStore";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";

export interface CallAttribution {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly virtualNumberDisplay: string;
	readonly providerLabel: string;
	readonly utmSource?: string | undefined;
	readonly utmCampaign?: string | undefined;
	readonly utmMedium?: string | undefined;
	readonly utmSummary: string;
	readonly notesPayload: string;
}

export const CHANNEL_DISPLAY_NAMES: Record<CanonicalMarketingChannelKey, string> = {
	yandex_direct: "Яндекс.Директ",
	gis_2: "2ГИС Карты",
	prodoctorov: "ПроДокторов",
	napopravku: "НаПоправку",
	site_seo: "Сайт / SEO",
	social_media: "Соцсети (VK / TG)",
	recommendations: "Рекомендации",
	avito: "Авито",
	yandex_maps: "Яндекс.Карты",
	max: "Мессенджер MAX",
	other: "Прямой звонок / ВАТС",
};

const CALM_CHANNEL_BADGE = {
	bg: "var(--paper-soft)",
	text: "var(--ink)",
	color: "var(--muted)",
	border: "var(--line)",
};

export const CHANNEL_BADGE_COLORS: Record<
	CanonicalMarketingChannelKey,
	{ bg: string; text: string; color: string; border: string }
> = {
	yandex_direct: CALM_CHANNEL_BADGE,
	gis_2: CALM_CHANNEL_BADGE,
	prodoctorov: CALM_CHANNEL_BADGE,
	napopravku: CALM_CHANNEL_BADGE,
	site_seo: CALM_CHANNEL_BADGE,
	social_media: CALM_CHANNEL_BADGE,
	recommendations: CALM_CHANNEL_BADGE,
	avito: CALM_CHANNEL_BADGE,
	yandex_maps: CALM_CHANNEL_BADGE,
	max: CALM_CHANNEL_BADGE,
	other: CALM_CHANNEL_BADGE,
};

/**
 * Определяет рекламный канал по метаданным входящего звонка ВАТС.
 * Анализирует:
 * 1. UTM-метки коллтрекинга (utmSource, utmCampaign)
 * 2. Явный рекламный канал (advertisingChannel)
 * 3. Подменный номер ВАТС / транк DID (virtualNumber, calledDid, clinicPhone)
 * 4. Конфигурацию подменных номеров клиники (clinicVirtualTrunkMap)
 */
export function resolveCallAdvertisingAttribution(
	call: IncomingCallPayload,
	clinicVirtualTrunkMap?: Record<string, string>,
): CallAttribution {
	let channelKey: CanonicalMarketingChannelKey = "other";

	const utmSource = (call.utmSource || "").trim().toLowerCase();
	const utmCampaign = (call.utmCampaign || "").trim().toLowerCase();
	const utmMedium = (call.utmMedium || "").trim().toLowerCase();

	// 1. Приоритет UTM-меток коллтрекинга
	if (utmSource || utmCampaign) {
		const combined = `${utmSource} ${utmCampaign} ${utmMedium}`;
		if (/yandex|direct|директ|рся|rsya/i.test(combined)) {
			channelKey = "yandex_direct";
		} else if (/2gis|gis|2гис|дубльгис/i.test(combined)) {
			channelKey = "gis_2";
		} else if (/prodoctorov|продокторов/i.test(combined)) {
			channelKey = "prodoctorov";
		} else if (/napopravku|напоправку/i.test(combined)) {
			channelKey = "napopravku";
		} else if (/site|сайт|seo|сео|органика|organic|google/i.test(combined)) {
			channelKey = "site_seo";
		} else if (/vk|vkontakte|telegram|tg|вк|инста|instagram/i.test(combined)) {
			channelKey = "social_media";
		} else if (/rec|сарафан|рекомендаци|friend/i.test(combined)) {
			channelKey = "recommendations";
		}
	}

	// 2. Приоритет явного канала (если не распознано по UTM)
	if (channelKey === "other" && call.advertisingChannel) {
		channelKey = normalizeMarketingChannel(call.advertisingChannel);
	}

	// 3. Распознавание по номеру виртуальной АТС / DID транку клиники
	const rawTrunk = (
		call.virtualNumber ||
		call.calledDid ||
		call.clinicPhone ||
		""
	).trim();

	if (channelKey === "other" && rawTrunk) {
		// Проверка по кастомной карте транков клиники
		if (clinicVirtualTrunkMap && rawTrunk in clinicVirtualTrunkMap) {
			channelKey = normalizeMarketingChannel(clinicVirtualTrunkMap[rawTrunk]);
		} else {
			// Проверка сигнатур подменных транков
			const trunkLower = rawTrunk.toLowerCase();
			if (/yandex|direct|директ/i.test(trunkLower)) {
				channelKey = "yandex_direct";
			} else if (/2gis|2гис|gis/i.test(trunkLower)) {
				channelKey = "gis_2";
			} else if (/prodoc|продокт/i.test(trunkLower)) {
				channelKey = "prodoctorov";
			} else if (/napopr|напопр/i.test(trunkLower)) {
				channelKey = "napopravku";
			} else if (/seo|site|сайт/i.test(trunkLower)) {
				channelKey = "site_seo";
			} else if (/vk|tg|social/i.test(trunkLower)) {
				channelKey = "social_media";
			}
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

	// Формирование сводки UTM
	const utmParts: string[] = [];
	if (call.utmSource) utmParts.push(`source: ${call.utmSource}`);
	if (call.utmCampaign) utmParts.push(`campaign: ${call.utmCampaign}`);
	if (call.utmMedium) utmParts.push(`medium: ${call.utmMedium}`);
	if (call.utmContent) utmParts.push(`content: ${call.utmContent}`);
	const utmSummary = utmParts.join(" | ");

	// Полное примечание для лида в CRM
	const notesPayload = [
		`Входящий звонок через ВАТС (${providerLabel}).`,
		virtualNumberDisplay ? `Номер ВАТС: ${virtualNumberDisplay}.` : null,
		`Рекламный канал: ${channelLabel}.`,
		utmSummary ? `UTM-метки: [${utmSummary}].` : null,
		call.callId ? `ID звонка АТС: ${call.callId}.` : null,
	]
		.filter(Boolean)
		.join(" ");

	const summaryText = virtualNumberDisplay
		? `${channelLabel} (${virtualNumberDisplay})`
		: `${channelLabel} (${providerLabel})`;

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

/**
 * 1-Клик захват звонящего с незнакомого номера в CRM-лиды.
 * Автоматически размечает рекламный канал (Яндекс.Директ, 2ГИС, ПроДокторов, SEO).
 */
export async function captureLeadFromIncomingCall(
	call: IncomingCallPayload,
	options?: {
		customName?: string | undefined;
		customNotes?: string | undefined;
		assignedDoctorId?: string | undefined;
		clinicVirtualTrunkMap?: Record<string, string> | undefined;
	},
): Promise<{
	success: boolean;
	lead?: unknown;
	attribution: CallAttribution;
	message: string;
}> {
	const attribution = resolveCallAdvertisingAttribution(
		call,
		options?.clinicVirtualTrunkMap,
	);

	const formattedPhone = formatPhoneDisplay(call.phone);
	const targetName =
		options?.customName?.trim() ||
		(call.patientName && call.patientName !== "Неизвестный номер"
			? call.patientName
			: `Звонок ${formattedPhone}`);

	const targetNotes = [attribution.notesPayload, options?.customNotes?.trim()]
		.filter(Boolean)
		.join("\n\n");

	const payload = {
		name: targetName,
		patientName: targetName,
		phone: call.phone,
		source: attribution.channelKey,
		status: "new" as const,
		notes: targetNotes,
		assignedDoctorId: options?.assignedDoctorId || null,
	};

	try {
		const res = await fetch("/api/leads", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-staff-token": readDenteStaffToken(),
				"x-dente-clinic-token": readDenteClinicToken(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			let errMsg = "Ошибка при сохранении лида";
			try {
				const body = await res.json();
				if (body?.message) errMsg = body.message;
			} catch {}
			return {
				success: false,
				attribution,
				message: errMsg,
			};
		}

		const createdLead = await res.json();

		// Обновляем активный вызов в telephonyStore
		const active = useTelephonyStore.getState().activeCall;
		if (active && (active.phone === call.phone || active.callId === call.callId)) {
			useTelephonyStore.getState().triggerIncomingCall({
				...active,
				leadId: createdLead.id,
				isLeadCaptured: true,
				advertisingChannel: attribution.channelKey,
			});
		}

		// Добавляем лид в стор обращений
		try {
			const leadsState = useLeadsStore.getState();
			if (leadsState.leads && !leadsState.leads.some((l) => l.id === createdLead.id)) {
				useLeadsStore.setState({
					leads: [createdLead, ...leadsState.leads],
				});
			}
		} catch {
			// ignore store sync failure in headless / mock environments
		}

		return {
			success: true,
			lead: createdLead,
			attribution,
			message: `Лид успешно создан: ${targetName} (${attribution.channelLabel})`,
		};
	} catch (err: unknown) {
		const msg =
			err instanceof Error && err.message
				? err.message
				: "Нет связи с сервером при создании лида";
		return {
			success: false,
			attribution,
			message: msg,
		};
	}
}

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

