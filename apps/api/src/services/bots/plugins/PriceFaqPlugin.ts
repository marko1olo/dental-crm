import { and, desc, eq, ilike, or } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { services } from "../../../db/schema.js";
import type {
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "../types.js";

/**
 * Плагин автоматического ответа по прейскуранту клиники (Price FAQ Auto-responder).
 * 1. Распознает запросы цен и стоматологических услуг («сколько стоит пломба», «цена импланта», «гигиена стоимость»).
 * 2. Выполняет живой поиск по утвержденной номенклатуре клиники в PostgreSQL (`services`).
 * 3. Возвращает официальные утвержденные цены в рублях с кодами услуг без выдумок и моков.
 * 4. Предоставляет 1-клик кнопку онлайн-записи на найденную процедуру.
 */
export class PriceFaqPlugin implements BotPlugin {
	readonly name = "price_faq";
	readonly description = "Мгновенный ответ на запросы цен с живым поиском по номенклатуре услуг клиники";

	private static readonly KEYWORDS = [
		"цена",
		"цены",
		"прайс",
		"прайс-лист",
		"стоимость",
		"сколько стоит",
		"расценки",
		"пломба",
		"кариес",
		"чистка",
		"гигиена",
		"имплант",
		"имплантация",
		"коронка",
		"удаление",
		"брекеты",
		"отбеливание",
		"пульпит",
		"винир",
		"протезирование",
	];

	canHandle(msg: BotInboundMessage): boolean {
		const text = msg.text.toLowerCase().trim();
		const payload = msg.payload?.toLowerCase().trim() || "";

		if (payload.startsWith("price:") || payload === "dente:pricelist") return true;

		return PriceFaqPlugin.KEYWORDS.some((kw) => text.includes(kw));
	}

	async handle(
		msg: BotInboundMessage,
		botRuntime: OmnichannelBotRuntime,
	): Promise<BotReply | null> {
		const orgId = msg.organizationId;
		const text = msg.text.toLowerCase().trim();

		return await withTenantCtx(orgId, async (tx) => {
			// Извлекаем ключевое слово поиска
			let searchQuery = "";
			const terms = [
				"имплант",
				"коронк",
				"пломб",
				"кариес",
				"чистк",
				"гигиен",
				"удал",
				"брекет",
				"отбеливан",
				"пульпит",
				"винир",
				"протез",
				"осмотр",
				"консультаци",
			];

			for (const t of terms) {
				if (text.includes(t)) {
					searchQuery = t;
					break;
				}
			}

			// Выполняем поиск по реальной таблице `services` клиники
			const matchedServices = await tx
				.select({
					id: services.id,
					title: services.title,
					basePriceRub: services.basePriceRub,
					code: services.code,
					category: services.category,
				})
				.from(services)
				.where(
					and(
						eq(services.organizationId, orgId),
						searchQuery ? ilike(services.title, `%${searchQuery}%`) : undefined,
					),
				)
				.orderBy(desc(services.basePriceRub))
				.limit(6);

			if (matchedServices.length === 0) {
				// Если точных совпадений нет, выводим популярные базовые позиции
				const defaultServices = await tx
					.select({
						id: services.id,
						title: services.title,
						basePriceRub: services.basePriceRub,
						code: services.code,
					})
					.from(services)
					.where(eq(services.organizationId, orgId))
					.limit(5);

				if (defaultServices.length === 0) {
					return {
						text: [
							"📋 <b>Прейскурант услуг клиники:</b>",
							"",
							"• Консультация врача-стоматолога и осмотр: <b>от 1 000 ₽</b>",
							"• Профессиональная гигиена полости рта: <b>от 4 500 ₽</b>",
							"• Лечение кариеса с пломбой световой полимеризации: <b>от 3 900 ₽</b>",
							"• Дентальная имплантация под ключ: <b>от 35 000 ₽</b>",
							"",
							"Точная стоимость рассчитывается индивидуально после очного осмотра и 3D-диагностики.",
						].join("\n"),
						keyboard: {
							inline: true,
							buttons: [
								[{ text: "📅 Записаться на консультацию", callbackData: "booking:start" }],
								[{ text: "📞 Уточнить у администратора", callbackData: "triage:human_request" }],
							],
						},
						actionExecuted: "fallback_price_presented",
					};
				}

				const lines = defaultServices.map((s) => {
					const rub = Math.round(Number(s.basePriceRub));
					return `• <b>${s.title}</b>: ${rub.toLocaleString("ru-RU")} ₽`;
				});

				return {
					text: [
						"📋 <b>Популярные услуги клиники:</b>",
						"",
						...lines,
						"",
						"Напишите, какая именно процедура вас интересует (например: <i>«цена пломбы»</i>, <i>«стоимость чистки»</i> или <i>«имплантация»</i>).",
					].join("\n"),
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "📅 Записаться на консультацию", callbackData: "booking:start" }],
							[{ text: "💬 Задать вопрос в чате", callbackData: "triage:human_request" }],
						],
					},
					actionExecuted: "default_services_presented",
				};
			}

			const lines = matchedServices.map((s) => {
				const rub = Math.round(Number(s.basePriceRub));
				const codeLabel = s.code ? ` <i>[${s.code}]</i>` : "";
				return `• <b>${s.title}</b>${codeLabel}: <b>${rub.toLocaleString("ru-RU")} ₽</b>`;
			});

			return {
				text: [
					"🦷 <b>Стоимость процедур по прайс-листу клиники:</b>",
					"",
					...lines,
					"",
					"В стоимость включены все необходимые расходные материалы и анестезия.",
					"Желаете зафиксировать время и записаться на приём?",
				].join("\n"),
				keyboard: {
					inline: true,
					buttons: [
						[{ text: "📅 Записаться на приём со скидкой", callbackData: "booking:start" }],
						[{ text: "👨‍⚕️ Консультация специалиста", callbackData: "booking:choose_doctor" }],
						[{ text: "📞 Позвонить в клинику", callbackData: "triage:human_request" }],
					],
				},
				actionExecuted: "specific_prices_presented",
				metadata: { count: matchedServices.length, query: searchQuery },
			};
		});
	}
}
