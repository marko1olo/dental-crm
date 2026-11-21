/**
 * marketingAnalyticsUtils.ts — Вспомогательные утилиты, детекторы каналов и справочники аналитики.
 */

import {
	canonicalizeMarketingChannel,
	CANONICAL_MARKETING_CHANNELS,
	type CanonicalMarketingChannel,
} from "@dental/shared";

/** Очистка номера телефона до цифр */
export function cleanPhoneDigits(phone?: string | null): string {
	return (phone || "").replace(/\D/g, "");
}

/** Безопасный расчет процентов с защитой от деления на 0, NaN, Infinity и отрицательных дропоффов */
export function safePercent(val: number): number {
	if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
	return Math.max(0, Math.min(100, Number(val.toFixed(1))));
}

/** Детектор канала привлечения по текстовому источнику лида / визита (Мандат 8ap) */
export function detectChannelFromSource(source?: string | null): string {
	if (!source) return "telephony";
	const s = source.toLowerCase().trim();

	// 1. Мессенджеры и чатботы
	if (s.includes("tg") || s.includes("telegr") || s.includes("телеграм")) return "tg_bot";
	if (s.includes("wa") || s.includes("whats") || s.includes("ватсап") || s.includes("waba")) return "wa_bot";

	// 2. Мед-агрегаторы (ПроДокторов, СберЗдоровье / DocDoc)
	if (s.includes("prodoctorov") || s.includes("продокторов")) return "prodoctorov";
	if (s.includes("sber") || s.includes("сбер") || s.includes("docdoc") || s.includes("доктор")) return "prodoctorov";

	// 3. Партнеры, страховые компании, ДМС
	if (
		s === "partner" ||
		s.includes("страхов") ||
		s.includes("партнер") ||
		s.includes("дмс") ||
		s.includes("dms")
	) {
		return "partner";
	}

	// 4. Прямые звонки АТС и регистратура
	if (
		s.includes("phone") ||
		s.includes("call") ||
		s.includes("звонок") ||
		s.includes("тел") ||
		s.includes("атс") ||
		s.includes("admin") ||
		s.includes("регистратур") ||
		s.includes("рецепшн")
	) {
		return "telephony";
	}

	// 5. Канонический маппинг через глобальный SSOT таксономии
	const canonical = canonicalizeMarketingChannel(s);
	if (canonical === "word_of_mouth") return "word_of_mouth";
	if (canonical === "gis2") return "gis2";
	if (canonical === "website") return "website";
	if (canonical === "yandex_maps") return "yandex_maps";
	if (canonical === "prodoctorov") return "prodoctorov";
	if (canonical === "other") return "telephony";

	return canonical;
}

/** Нормализатор ключа канала привлечения */
export function normalizeChannelKey(key?: string | null): string {
	if (!key) return "telephony";
	const k = key.toLowerCase().trim();
	if (k === "referral" || k === "word_of_mouth") return "word_of_mouth";
	if (k === "gis_2" || k === "gis2" || k === "2gis" || k.includes("gis") || k.includes("гис")) return "gis2";
	if (
		k === "website_widget" ||
		k === "website" ||
		k === "widget" ||
		k === "site" ||
		k.includes("виджет") ||
		k.includes("сайт")
	) {
		return "website";
	}
	if (k === "partner" || k.includes("партнер") || k.includes("страхов") || k.includes("дмс")) return "partner";
	if (k === "maps") return "maps";
	if (
		k === "yandex" ||
		k === "yandex_maps" ||
		k === "yandex_direct" ||
		k === "direct" ||
		k.includes("яндекс") ||
		k.includes("карты")
	) {
		return "yandex_maps";
	}
	if (k === "prodoctorov" || k === "sber" || k === "docdoc" || k.includes("продокторов") || k.includes("доктор")) {
		return "prodoctorov";
	}
	if (k === "tg" || k === "telegram" || k === "tg_bot" || k.includes("телеграм")) return "tg_bot";
	if (k === "wa" || k === "whatsapp" || k === "wa_bot" || k === "waba" || k.includes("ватсап")) return "wa_bot";
	if (k === "phone" || k === "call" || k === "telephony" || k.includes("звонок")) return "telephony";
	return detectChannelFromSource(key);
}

/** Справочник каналов онлайн-самозаписи */
export const ONLINE_CHANNEL_DEFS = [
	{ key: "website", nameRu: "Сайт клиники (Виджет самозаписи)", categoryRu: "Сайт и лендинги" },
	{ key: "yandex_maps", nameRu: "Яндекс Карты (Кнопка «Записаться»)", categoryRu: "Гео-сервисы" },
	{ key: "gis2", nameRu: "2ГИС (Профиль клиники / Запись)", categoryRu: "Гео-сервисы" },
	{ key: "word_of_mouth", nameRu: "Сарафанное радио (Рекомендации)", categoryRu: "Рекомендации" },
	{ key: "partner", nameRu: "Партнеры (Страховые / Мед-агрегаторы)", categoryRu: "Партнеры" },
	{ key: "prodoctorov", nameRu: "ПроДокторов / СберЗдоровье", categoryRu: "Мед-агрегаторы" },
	{ key: "tg_bot", nameRu: "Telegram-бот / Mini App", categoryRu: "Мессенджеры" },
	{ key: "wa_bot", nameRu: "WhatsApp-чатбот / WABA", categoryRu: "Мессенджеры" },
] as const;

/** Маппинг русских названий каналов */
export const CHANNEL_NAMES_RU_MAP: Record<string, string> = {
	word_of_mouth: "Сарафанное радио / Рекомендации",
	referral: "Сарафанное радио / Рекомендации",
	partner: "Партнеры / Страховые / ДМС",
	maps: "Гео-сервисы (Яндекс Карты / 2ГИС)",
	website: "Сайт клиники / Онлайн-запись",
	website_widget: "Сайт клиники / Онлайн-запись",
	yandex_maps: "Яндекс Карты",
	gis2: "2ГИС Карты",
	gis_2: "2ГИС Карты",
	prodoctorov: "ПроДокторов",
	tg_bot: "Telegram-бот",
	wa_bot: "WhatsApp-чатбот",
	telephony: "Телефония / Звонок",
};
