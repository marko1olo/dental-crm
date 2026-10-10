/**
 * packages/shared/src/analytics/callTracking/utmAndNumberAttribution.ts
 *
 * UTM Parameters Resolution, Query Parsing & Patient Attribution Presets.
 */

import { parseKopecks } from "../../utils/money.js";
import type { UtmParameters, PatientAttributionRecord } from "./types.js";

// ─── 1. UTM PARSER UTILITY ───────────────────────────────────────────────────

/**
 * Parses UTM parameters from full URL or query string safely.
 */
export function parseUtmFromUrl(urlOrQuery: string): UtmParameters {
	if (!urlOrQuery || typeof urlOrQuery !== "string") {
		return {
			utm_source: "",
			utm_medium: "",
			utm_campaign: "",
			utm_content: "",
			utm_term: "",
			referrer: "",
			landingPage: "",
		};
	}

	try {
		let queryPart = urlOrQuery.trim();
		let landingPage = "";

		if (queryPart.startsWith("http://") || queryPart.startsWith("https://")) {
			const parsedUrl = new URL(queryPart);
			queryPart = parsedUrl.search;
			landingPage = parsedUrl.pathname;
		} else if (queryPart.includes("?")) {
			const parts = queryPart.split("?");
			landingPage = parts[0] ?? "";
			queryPart = `?${parts[1] ?? ""}`;
		} else if (!queryPart.startsWith("?")) {
			queryPart = `?${queryPart}`;
		}

		const params = new URLSearchParams(queryPart);

		return {
			utm_source: params.get("utm_source")?.trim() || "",
			utm_medium: params.get("utm_medium")?.trim() || "",
			utm_campaign: params.get("utm_campaign")?.trim() || "",
			utm_content: params.get("utm_content")?.trim() || "",
			utm_term: params.get("utm_term")?.trim() || "",
			referrer: params.get("ref")?.trim() || params.get("referrer")?.trim() || "",
			landingPage,
		};
	} catch {
		return {
			utm_source: "",
			utm_medium: "",
			utm_campaign: "",
			utm_content: "",
			utm_term: "",
			referrer: "",
			landingPage: "",
		};
	}
}

// ─── 2. SAMPLE PATIENT ATTRIBUTION PRESETS ───────────────────────────────────

export const SAMPLE_PATIENT_ATTRIBUTIONS: readonly PatientAttributionRecord[] = [
	{
		id: "attr-101",
		patientId: "PAT-001",
		patientFullName: "Смирнова Екатерина Васильевна",
		phone: "+7 (926) 555-12-34",
		createdAtIso: "2026-08-20T10:14:00.000Z",
		channelKey: "yandex_direct",
		channelNameRu: "Яндекс.Директ",
		categoryRu: "Контекстная реклама",
		utm: {
			utm_source: "yandex",
			utm_medium: "cpc",
			utm_campaign: "msk_implants_microscope",
			utm_content: "banner_3",
			utm_term: "лечение корневых каналов цена",
			referrer: "https://yandex.ru/search",
			landingPage: "/services/endodontics",
		},
		externalIds: {
			calltouchId: "ct-984210",
			roistatId: "roi-44021",
			mangoCallId: "mng-88412",
			yandexClientId: "ya-client-771249",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 184,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт-эндодонтист",
		appointmentDateIso: "2026-08-21T11:30:00.000Z",
		treatmentPlanTitle: "Эндодонтическое лечение зуба 1.6 под микроскопом",
		totalPaidKopecks: parseKopecks("24500.00"),
		notes: "Обратилась по острой боли после перехода с рекламы Яндекса",
	},
	{
		id: "attr-102",
		patientId: "PAT-002",
		patientFullName: "Барабаш Сергей Владимирович",
		phone: "+7 (916) 123-45-67",
		createdAtIso: "2026-08-22T14:20:00.000Z",
		channelKey: "gis_2",
		channelNameRu: "2ГИС",
		categoryRu: "Гео-сервисы и карты",
		utm: {
			utm_source: "2gis",
			utm_medium: "maps_profile",
			utm_campaign: "geo_radius_3km",
			utm_content: "button_online_booking",
			utm_term: "стоматология рядом",
			referrer: "https://2gis.ru",
			landingPage: "/booking",
		},
		externalIds: {
			calltouchId: "ct-984235",
			roistatId: "roi-44056",
			mangoCallId: "mng-88450",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 142,
		sipProvider: "mango",
		doctorName: "Д-р Барабаш Сергей Владимирович",
		specialtyRu: "Хирург-имплантолог",
		appointmentDateIso: "2026-08-23T15:00:00.000Z",
		treatmentPlanTitle: "Дентальная имплантация Astra Tech (21, 22)",
		totalPaidKopecks: parseKopecks("72000.00"),
		notes: "Записался через кнопку 2ГИС, выбрал ближайшую клинику к офису",
	},
	{
		id: "attr-103",
		patientId: "PAT-003",
		patientFullName: "Кузнецов Дмитрий Игоревич",
		phone: "+7 (903) 777-99-11",
		createdAtIso: "2026-08-24T09:45:00.000Z",
		channelKey: "telegram_ads",
		channelNameRu: "Telegram Ads",
		categoryRu: "Мессенджеры",
		utm: {
			utm_source: "telegram",
			utm_medium: "tg_ads",
			utm_campaign: "tg_channel_dental_care",
			utm_content: "post_aligners_discount",
			utm_term: "элайнеры москва",
			referrer: "https://t.me/dental_msk",
			landingPage: "/orthodontics/aligners",
		},
		externalIds: {
			calltouchId: "ct-984288",
			roistatId: "roi-44102",
		},
		currentStage: "attended",
		sipCallDurationSeconds: 210,
		sipProvider: "uis",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Ортодонт",
		appointmentDateIso: "2026-08-25T16:30:00.000Z",
		treatmentPlanTitle: "Консультация ортодонта + 3D-сканирование для элайнеров",
		totalPaidKopecks: parseKopecks("5000.00"),
		notes: "Прошел консультацию, ожидает расчет плана лечения элайнерами",
	},
	{
		id: "attr-104",
		patientId: "PAT-004",
		patientFullName: "Волкова Анна Михайловна",
		phone: "+7 (915) 333-88-22",
		createdAtIso: "2026-08-25T11:10:00.000Z",
		channelKey: "prodoctorov",
		channelNameRu: "ПроДокторов",
		categoryRu: "Медицинские порталы",
		utm: {
			utm_source: "prodoctorov",
			utm_medium: "profile_card",
			utm_campaign: "doc_smirnov_reviews",
			utm_content: "badge_top_rating",
			utm_term: "лучший терапевт отзывы",
			referrer: "https://prodoctorov.ru",
			landingPage: "/doctors/smirnov-alexey",
		},
		externalIds: {
			calltouchId: "ct-984312",
			roistatId: "roi-44140",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 165,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт",
		appointmentDateIso: "2026-08-26T12:00:00.000Z",
		treatmentPlanTitle: "Профессиональная гигиена AirFlow + фторирование",
		totalPaidKopecks: parseKopecks("8500.00"),
		notes: "Записалась по отзывам о враче на портале ПроДокторов",
	},
	{
		id: "attr-105",
		patientId: "PAT-005",
		patientFullName: "Федоров Максим Сергеевич",
		phone: "+7 (925) 444-11-99",
		createdAtIso: "2026-08-26T16:00:00.000Z",
		channelKey: "vk_ads",
		channelNameRu: "VK Реклама",
		categoryRu: "Социальные сети",
		utm: {
			utm_source: "vkontakte",
			utm_medium: "targeted_ads",
			utm_campaign: "geo_district_whitening",
			utm_content: "creative_zoom4_promo",
			utm_term: "отбеливание зубов акция",
			referrer: "https://vk.com",
			landingPage: "/whitening",
		},
		externalIds: {
			calltouchId: "ct-984390",
		},
		currentStage: "booked",
		sipCallDurationSeconds: 95,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт",
		appointmentDateIso: "2026-08-29T10:00:00.000Z",
		treatmentPlanTitle: "Первичный осмотр перед отбеливанием Zoom 4",
		totalPaidKopecks: 0,
		notes: "Записан на завтра, подтвердил визит по SMS",
	},
];
