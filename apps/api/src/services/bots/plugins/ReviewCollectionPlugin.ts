import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	clinics,
	denteTelegramBotConfigs,
} from "../../../db/schema.js";
import type {
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "../types.js";

/**
 * Плагин автоматического сбора отзывов и управления репутацией (Review Collection Plugin).
 * Автоматически срабатывает после завершения визита (статус completed/signed):
 * 1. Отправляет вежливую благодарность за доверие к докторам клиники.
 * 2. Предлагает прямые ссылки на Яндекс.Карты, 2ГИС и ПроДокторов.
 * 3. Помогает поднимать рейтинг клиники в локальной поисковой выдаче РФ без навязчивого спама.
 */
export class ReviewCollectionPlugin implements BotPlugin {
	readonly name = "review_collection";
	readonly description = "Сбор отзывов на Яндекс.Картах, 2ГИС и ПроДокторов после завершённого приёма";

	canHandle(msg: BotInboundMessage): boolean {
		const text = msg.text.toLowerCase().trim();
		const payload = msg.payload?.toLowerCase().trim() || "";

		if (payload === "reviews:get_links" || payload === "dente:review") return true;

		const keywords = [
			"отзыв",
			"оставить отзыв",
			"яндекс карты",
			"2гис",
			"продокторов",
			"поставить оценку",
			"написать отзыв",
			"поделиться впечатлениями",
		];
		return keywords.some((kw) => text.includes(kw));
	}

	async handle(
		msg: BotInboundMessage,
		botRuntime: OmnichannelBotRuntime,
	): Promise<BotReply | null> {
		const orgId = msg.organizationId;

		let clinicName = (botRuntime.metadata?.clinicName as string) || "нашей стоматологической клинике";
		let yandexUrl = (botRuntime.metadata?.yandexMapsUrl as string) || null;
		let gisUrl = (botRuntime.metadata?.twoGisUrl as string) || null;
		let prodoctorovUrl = (botRuntime.metadata?.prodoctorovUrl as string) || null;

		try {
			await withTenantCtx(orgId, async (tx) => {
				const [clinic] = await tx
					.select({
						name: clinics.name,
						address: clinics.address,
					})
					.from(clinics)
					.where(eq(clinics.organizationId, orgId))
					.limit(1);

				const [botConfig] = await tx
					.select({
						clinicReviewUrl: denteTelegramBotConfigs.clinicReviewUrl,
						clinicMapsUrl: denteTelegramBotConfigs.clinicMapsUrl,
					})
					.from(denteTelegramBotConfigs)
					.where(eq(denteTelegramBotConfigs.organizationId, orgId))
					.limit(1);

				if (clinic?.name) clinicName = clinic.name;
				if (botConfig?.clinicMapsUrl) yandexUrl = botConfig.clinicMapsUrl;
				if (botConfig?.clinicReviewUrl && !yandexUrl) yandexUrl = botConfig.clinicReviewUrl;
			});
		} catch {
			// DB offline fallback
		}

		if (!yandexUrl) {
			yandexUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(clinicName + " стоматология")}`;
		}
		if (!gisUrl) {
			gisUrl = `https://2gis.ru/search/${encodeURIComponent(clinicName)}`;
		}
		if (!prodoctorovUrl) {
			prodoctorovUrl = `https://prodoctorov.ru/search/?q=${encodeURIComponent(clinicName)}`;
		}

			return {
				text: [
					`🌟 <b>Спасибо, что доверяете заботу о вашей улыбке ${clinicName}!</b>`,
					"",
					"Для наших докторов лучшая награда — видеть вас здоровыми и счастливыми.",
					"Пожалуйста, уделите 1 минуту и поделитесь вашими впечатлениями на одной из площадок:",
					"",
					`📍 <b>Яндекс.Карты:</b> честная оценка сервиса и работы врачей`,
					`📍 <b>2ГИС:</b> помощь жителям района в выборе хорошей стоматологии`,
					`⭐ <b>ПроДокторов:</b> профессиональный отзыв о вашем лечащем враче`,
					"",
					"Ваш отзыв помогает другим пациентам преодолеть страх и получить качественное лечение! ❤️",
				].join("\n"),
				keyboard: {
					inline: true,
					buttons: [
						[
							{ text: "🌟 Оставить отзыв на Яндекс.Картах", url: yandexUrl },
						],
						[
							{ text: "📍 Оставить отзыв в 2ГИС", url: gisUrl },
						],
						[
							{ text: "👨‍⚕️ Написать отзыв на ПроДокторов", url: prodoctorovUrl },
						],
						[
							{ text: "💬 Написать лично руководству клиники", callbackData: "triage:feedback_complaint" },
						],
					],
				},
				actionExecuted: "review_links_presented",
				metadata: { yandexUrl, gisUrl, prodoctorovUrl },
			};
	}

	/**
	 * Генерация триггерного сообщения при переводе визита в статус completed в CRM.
	 */
	static createCompletedVisitReviewInvitation(clinicName: string, doctorName?: string): BotReply {
		const docGreeting = doctorName ? ` у доктора ${doctorName}` : "";
		return {
			text: [
				`👋 Надеемся, ваш сегодняшний визит${docGreeting} прошёл комфортно и безболезненно!`,
				"",
				"Пожалуйста, поделитесь вашими впечатлениями о клинике — это займет меньше минуты и очень поможет нашей команде становиться лучше каждый день:",
			].join("\n"),
			keyboard: {
				inline: true,
				buttons: [
					[
						{ text: "🌟 Оставить отзыв на Яндекс.Картах", callbackData: "reviews:get_links" },
					],
					[
						{ text: "👍 Всё отлично, спасибо!", callbackData: "triage:feedback_positive" },
						{ text: "💬 Есть замечания", callbackData: "triage:feedback_complaint" },
					],
				],
			},
			actionExecuted: "post_visit_review_prompt",
		};
	}
}
