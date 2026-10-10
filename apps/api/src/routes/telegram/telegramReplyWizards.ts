import type {
	DenteTelegramBotSettings, DenteTelegramFeature,
	DenteTelegramUpdateKind, DenteTelegramVisualCardKey,
} from "@dental/shared";
import {
	denteTelegramVisualCardUrlFor, createDenteTelegramCareRequest,
	createDenteTelegramContactRequest, createDenteTelegramDocumentRequest,
	buildDenteTelegramLinkedScheduleReply,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import { TelegramInteractiveTriageService } from "../../services/telegram/TelegramInteractiveTriageService.js";
import type {
	TelegramWebhookReplyPackage, TelegramRequestScope,
	DenteTelegramCareRequestTopic, TelegramSafeCallbackAction,
} from "./types.js";
import { isRecord, stringFromUnknown } from "./telegramUtils.js";
import {
	portalButton,
	safeHttpsTelegramButton,
	reviewButtons,
	mapButtons,
	telegramInlineKeyboardRows,
	mainMenuTelegramRow,
	careTopicFromFreeText,
	replyMarkupWithNextActions,
	safeCommandKeyboard,
	telegramCareCallbackTopicByAction,
} from "./telegramKeyboards.js";

export function reviewReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	const npsButtons: Array<{ text: string; callback_data: string }> = [
		{ text: "1 ⭐", callback_data: "nps:latest:1" },
		{ text: "2 ⭐", callback_data: "nps:latest:2" },
		{ text: "3 ⭐", callback_data: "nps:latest:3" },
		{ text: "4 ⭐", callback_data: "nps:latest:4" },
		{ text: "5 ⭐", callback_data: "nps:latest:5" },
	];
	const buttons = reviewButtons(settings);
	const rows: Array<Array<Record<string, unknown>>> = [
		npsButtons as Array<Record<string, unknown>>,
	];
	if (buttons.length > 0) {
		rows.push(buttons as Array<Record<string, unknown>>);
	}
	return {
		text: "Пожалуйста, оцените качество обслуживания и ваш визит в клинику от 1 до 5 звёзд:",
		replyMarkup: { inline_keyboard: rows },
		photoUrl: patientMenuCardPhoto(settings, "review"),
	};
}

export function mapReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	const buttons = mapButtons(settings);
	if (!buttons.length) {
		return {
			text: "Ссылка на карту клиники пока не настроена. Попросите администратора добавить карточку клиники в настройках DENTE.",
			replyMarkup: safeCommandKeyboard(settings, "clinic"),
		};
	}
	return {
		text: "Карта клиники доступна по безопасной общей ссылке ниже.",
		replyMarkup: replyMarkupWithNextActions([buttons], settings),
		photoUrl: patientMenuCardPhoto(settings, "review"),
	};
}

export function patientMenuCardPhoto(
	settings: DenteTelegramBotSettings,
	cardKey: DenteTelegramVisualCardKey = "mainMenu",
): string | null {
	return denteTelegramVisualCardUrlFor(settings, cardKey);
}

export function documentsReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	const portal = portalButton(settings, "documents");
	const rows = [
		[
			{ text: "Налоговая", callback_data: "dente:tax" },
			{ text: "Оплата и чеки", callback_data: "dente:billing" },
		],
		[{ text: "Медкарта", callback_data: "dente:medical-docs" }],
		[{ text: "Формы пациента", callback_data: "dente:patient-forms" }],
		portal,
		[
			{ text: "Позвать администратора", callback_data: "dente:contact" },
			{ text: "Памятки", callback_data: "dente:care" },
		],
		mainMenuTelegramRow(),
	].filter((row) => row.length);
	return {
		text: "DENTE: договоры, согласия, акты, счета, чеки, возвраты и налоговые справки открываются только в защищенном портале клиники. В Telegram доступны уведомления и кнопка перехода, без вложений с медданными.",
		replyMarkup: rows.length
			? { inline_keyboard: rows }
			: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "documents"),
	};
}

export function careReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	const portal = portalButton(settings, "care");
	const rows = [
		[
			{ text: "После удаления", callback_data: "dente:care-extraction" },
			{ text: "После имплантации", callback_data: "dente:care-implant" },
		],
		[
			{ text: "После пломбы", callback_data: "dente:care-filling" },
			{ text: "После эндодонтии", callback_data: "dente:care-endo" },
		],
		[
			{ text: "После хирургии", callback_data: "dente:care-surgery" },
			{ text: "После анестезии", callback_data: "dente:care-anesthesia" },
		],
		[{ text: "После гигиены", callback_data: "dente:care-hygiene" }],
		[
			{ text: "После протезирования", callback_data: "dente:care-prosthetics" },
			{ text: "После ортодонтии", callback_data: "dente:care-orthodontics" },
		],
		[
			{
				text: "После пародонтологии",
				callback_data: "dente:care-periodontology",
			},
		],
		portal,
		[
			{ text: "Документы", callback_data: "dente:documents" },
			{ text: "Позвать администратора", callback_data: "dente:contact" },
		],
		mainMenuTelegramRow(),
	].filter((row) => row.length);
	return {
		text: "DENTE: памятки после удаления, имплантации, пломбы, эндодонтии, хирургии, анестезии, гигиены, протезирования, ортодонтии и пародонтологии выдаются в портале после оформления приема. Выберите нужную памятку кнопкой ниже; бот присылает безопасное уведомление и кнопку, когда памятка готова.",
		replyMarkup: rows.length
			? { inline_keyboard: rows }
			: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "care"),
	};
}

export function documentSubmenuReplyFor(
	settings: DenteTelegramBotSettings,
	topic: "tax" | "billing" | "medical" | "patientForms",
	requestResult?: { text: string; linked: boolean } | null,
): TelegramWebhookReplyPackage {
	const portal = portalButton(
		settings,
		topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents",
	);
	const texts = {
		tax: "Налоговая: DENTE помогает подготовить заявление, данные для КНД 1151156, старую справку для расходов 2021-2023 и реестр оплат. Нужны фискальные чеки и данные плательщика. Готовые справки открываются в защищенном портале.",
		billing:
			"Оплата и чеки: DENTE помогает подготовить счет, чек, акт выполненных работ, график рассрочки или запрос на корректировку/возврат. Суммы и документы выдаются только через защищенный портал после проверки администратором.",
		medical:
			"Медкарта: выписка, запрос копий, расписка выдачи, DICOM/КЛКТ и другие медицинские документы готовятся в DENTE и выдаются через защищенный портал после проверки личности и полномочий.",
		patientForms:
			"Формы пациента: анкета, согласия, отказ, ПДн, представитель, фото/видео и документы визита заполняются в DENTE. Если нужна бумажная копия или помощь, нажмите кнопку администратора.",
	};
	const rows = [
		portal,
		requestResult && !requestResult.linked
			? [
					{ text: "Как получить код", callback_data: "dente:clinic" },
					{ text: "Документы", callback_data: "dente:documents" },
				]
			: [
					{ text: "Документы", callback_data: "dente:documents" },
					{ text: "Позвать администратора", callback_data: "dente:contact" },
				],
		mainMenuTelegramRow(),
	].filter((row) => row.length);
	return {
		text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n"),
		replyMarkup: rows.length
			? { inline_keyboard: rows }
			: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(
			settings,
			topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents",
		),
	};
}

export function careTopicReplyFor(
	settings: DenteTelegramBotSettings,
	topic: DenteTelegramCareRequestTopic,
	requestResult?: ReturnType<typeof createDenteTelegramCareRequest>,
): TelegramWebhookReplyPackage {
	const portal = portalButton(settings, "care");
	const texts: Record<DenteTelegramCareRequestTopic, string> = {
		extraction:
			"После удаления: не грейте область, не полощите активно первые сутки, не трогайте лунку, не курите и не употребляйте алкоголь. При нарастающей боли, отеке, температуре или кровотечении свяжитесь с клиникой.",
		implant:
			"После имплантации: соблюдайте холод и покой по назначению, не перегружайте область, принимайте препараты только по схеме врача. При боли, отеке, подвижности, температуре или кровотечении нажмите администратора.",
		filling:
			"После пломбы: дождитесь окончания анестезии перед едой, избегайте сильной нагрузки на зуб в первые часы. Если мешает прикус, есть боль при накусывании или чувствительность усиливается, свяжитесь с клиникой.",
		endo: "После эндодонтии: возможна чувствительность при накусывании. Не перегружайте зуб, соблюдайте схему препаратов врача и не затягивайте с постоянной реставрацией. При нарастающей боли, отеке или температуре нажмите администратора.",
		surgery:
			"После хирургии: не грейте область, не трогайте швы, не полощите активно первые сутки, соблюдайте ограничения и назначения врача. При кровотечении, температуре, нарастающем отеке или сильной боли нажмите администратора.",
		anesthesia:
			"После анестезии: не ешьте, пока сохраняется онемение, чтобы не травмировать щеку или язык. Если онемение держится необычно долго, боль усиливается или появилась аллергическая реакция, нажмите администратора.",
		hygiene:
			"После профгигиены: мягкая щетка, аккуратная гигиена, временно избегайте красящей пищи по рекомендации врача. Если десна кровит долго или боль усиливается, нажмите администратора.",
		prosthetics:
			"После протезирования: привыкайте к конструкции постепенно, не перегружайте ее твердой пищей и не корректируйте самостоятельно. Если коронка, мост, винир или протез мешает, натирает или расцементировался, нажмите администратора.",
		orthodontics:
			"После ортодонтии: соблюдайте режим ношения аппарата или элайнеров, используйте назначенный уход и не подкручивайте элементы без врача. Если брекет отклеился, дуга колет или аппарат натирает, нажмите администратора.",
		periodontology:
			"После пародонтологии: аккуратно очищайте десны по схеме врача, не пропускайте назначенные средства и контроль. Если кровоточивость, отек, боль или неприятный запах усиливаются, нажмите администратора.",
	};
	const clinicalInstruction = TelegramBotHostingService.getClinicalCareInstruction(topic);
	const textBody = clinicalInstruction.text || texts[topic];
	const rows = [
		portal,
		[
			{ text: "Все памятки", callback_data: "dente:care" },
			{ text: "Позвать администратора", callback_data: "dente:contact" },
		],
		mainMenuTelegramRow(),
	].filter((row) => row.length);
	return {
		text: [textBody, requestResult?.text].filter(Boolean).join("\n\n"),
		replyMarkup: rows.length
			? { inline_keyboard: rows }
			: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "care"),
	};
}

export function contactRequestReplyFor(
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const result = createDenteTelegramContactRequest(chatFingerprintValue, scope);
	const portal = portalButton(settings);
	const rows = [
		portal,
		result.linked
			? [
					{ text: "Расписание", callback_data: "dente:schedule" },
					{ text: "Документы", callback_data: "dente:documents" },
				]
			: [{ text: "Как получить код", callback_data: "dente:clinic" }],
		[{ text: "Помощь", callback_data: "dente:help" }],
		mainMenuTelegramRow(),
	].filter((row) => row.length);
	return {
		text: result.text,
		replyMarkup: rows.length
			? { inline_keyboard: rows }
			: safeCommandKeyboard(settings, result.linked ? "linked" : "rejected"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function telegramFeatureEnabled(
	settings: DenteTelegramBotSettings,
	feature: DenteTelegramFeature,
): boolean {
	return settings.enabledFeatures.includes(feature);
}

export function featureDisabledReplyFor(
	settings: DenteTelegramBotSettings,
	title: string,
): TelegramWebhookReplyPackage {
	return {
		text: `${title} сейчас отключены в настройках клиники DENTE. Выберите доступное действие кнопками ниже или позовите администратора.`,
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function unsafeTelegramAttachmentReplyFor(
	settings: DenteTelegramBotSettings,
	updateKind: DenteTelegramUpdateKind,
): TelegramWebhookReplyPackage {
	const label =
		updateKind === "voice"
			? "Голосовые сообщения"
			: updateKind === "photo"
				? "Фото и снимки"
				: "PDF, документы и файлы";
	return {
		text: `${label} в Telegram не принимаются как медицинские документы DENTE. Откройте защищенный портал или выберите кнопку: документы, памятки или администратор. Так клиника не потеряет файл и не смешает его с чужой картой.`,
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "documents"),
	};
}

export function normalizedFreeText(value: string | null): string {
	return value?.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? "";
}

export function freeTextIncludes(value: string, fragments: string[]): boolean {
	return fragments.some((fragment) => value.includes(fragment));
}

export function freeTextReplyFor(
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	messageText: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const text = normalizedFreeText(messageText);
	if (
		freeTextIncludes(text, ["налог", "ндфл", "вычет", "кнд", "1151156"]) ||
		(freeTextIncludes(text, ["справк"]) &&
			freeTextIncludes(text, ["оплат", "чек", "фиск"]))
	) {
		return telegramFeatureEnabled(settings, "tax_document_request")
			? documentSubmenuReplyFor(
					settings,
					"tax",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"tax",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Налоговые запросы");
	}
	if (
		freeTextIncludes(text, [
			"оплат",
			"счет",
			"счёт",
			"чек",
			"квитанц",
			"возврат",
			"рассроч",
			"акт",
		])
	) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"billing",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"billing",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Финансовые документы");
	}
	if (
		freeTextIncludes(text, [
			"медкарт",
			"выписк",
			"копи",
			"dicom",
			"клкт",
			"кт",
			"снимк",
		])
	) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"medical",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"medical",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Медицинские документы");
	}
	if (
		freeTextIncludes(text, ["соглас", "анкета", "форма", "пдн", "персонал"])
	) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"patientForms",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"patientForms",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Формы пациента");
	}
	if (freeTextIncludes(text, ["документ", "договор", "акт"])) {
		return documentsReplyFor(settings);
	}
	const careTopic = careTopicFromFreeText(text);
	if (careTopic) {
		return telegramFeatureEnabled(settings, "post_visit_instructions")
			? careTopicReplyFor(
					settings,
					careTopic,
					createDenteTelegramCareRequest(
						chatFingerprintValue,
						careTopic,
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Памятки после приема");
	}
	if (
		freeTextIncludes(text, [
			"памят",
			"рекоменд",
			"удален",
			"имплан",
			"пломб",
			"гигиен",
			"после",
		])
	) {
		return telegramFeatureEnabled(settings, "post_visit_instructions")
			? careReplyFor(settings)
			: featureDisabledReplyFor(settings, "Памятки после приема");
	}
	if (freeTextIncludes(text, ["распис", "запис", "прием", "визит", "время"])) {
		const scheduleReply = buildDenteTelegramLinkedScheduleReply(
			chatFingerprintValue,
			scope,
			settings,
		);
		return {
			text: scheduleReply.text,
			replyMarkup:
				scheduleReply.replyMarkup ??
				safeCommandKeyboard(
					settings,
					scheduleReply.linked ? "linked" : "rejected",
				),
			photoUrl: patientMenuCardPhoto(settings, "appointment"),
		};
	}
	if (
		freeTextIncludes(text, [
			"звон",
			"перезвон",
			"админ",
			"оператор",
			"связ",
			"боль",
			"отек",
			"кров",
			"температур",
		])
	) {
		return contactRequestReplyFor(settings, chatFingerprintValue, scope);
	}
	if (freeTextIncludes(text, ["опросник", "триаж", "беспокоит", "симптом"])) {
		const screen = TelegramInteractiveTriageService.getRootTriageScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (
		freeTextIncludes(text, [
			"калькулятор",
			"стоимост",
			"сколько стоит",
			"прайс",
			"цена",
			"цены",
			"расчет",
		])
	) {
		const screen = TelegramInteractiveTriageService.getCalculatorRootScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (
		freeTextIncludes(text, [
			"пульсир",
			"острая боль",
			"отек",
			"флегмон",
			"раздуло",
			"cito",
		])
	) {
		const screen = TelegramInteractiveTriageService.getEmergencyScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (
		freeTextIncludes(text, [
			"откололся",
			"скол",
			"выпала пломба",
			"пломба выпала",
		])
	) {
		const screen = TelegramInteractiveTriageService.getBrokenToothScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (freeTextIncludes(text, ["винир", "элайнер", "отбеливан", "улыбк"])) {
		const screen = TelegramInteractiveTriageService.getAestheticScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (
		freeTextIncludes(text, [
			"ребенок",
			"ребёнок",
			"боится врача",
			"детей",
			"детск",
		])
	) {
		const screen = TelegramInteractiveTriageService.getKidsScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (freeTextIncludes(text, ["отзыв", "оцен", "рейтинг"]))
		return reviewReplyFor(settings);
	if (freeTextIncludes(text, ["адрес", "карта", "как добраться", "где вы"]))
		return mapReplyFor(settings);
	return {
		text: "DENTE принял сообщение. Чтобы клиника быстро поняла запрос, выберите действие кнопками ниже. Команды писать не нужно.",
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function suggestedReplyFor(
	command: string | null,
	callbackAction: TelegramSafeCallbackAction | null,
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	updateKind: DenteTelegramUpdateKind,
	messageText: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const portal = settings.patientPortalBaseUrl || "защищенный портал DENTE";
	const normalizedCommand = command?.split("@")[0] ?? null;

	if (
		updateKind === "photo" ||
		updateKind === "document" ||
		(updateKind === "voice" && !settings.allowVoiceIntake)
	) {
		return unsafeTelegramAttachmentReplyFor(settings, updateKind);
	}

	if (normalizedCommand === "/start" || callbackAction === "dente:start") {
		const linkedStartReply = buildDenteTelegramLinkedScheduleReply(
			chatFingerprintValue,
			scope,
			settings,
		);
		if (linkedStartReply.linked) {
			return {
				text:
					linkedStartReply.subjectType === "staff"
						? "DENTE: рабочий Telegram подключен. Выберите расписание, связь или откройте защищенный DENTE-портал. ФИО пациентов и медицинские детали в Telegram не отправляются."
						: "DENTE: Telegram подключен к клинике. Выберите расписание, документы, памятки или связь с администратором кнопками ниже. Медицинские документы открываются только в защищенном портале.",
				replyMarkup:
					linkedStartReply.subjectType === "staff"
						? (linkedStartReply.replyMarkup ??
							safeCommandKeyboard(settings, "linked"))
						: safeCommandKeyboard(settings, "linked"),
				photoUrl: patientMenuCardPhoto(
					settings,
					linkedStartReply.subjectType === "staff" ? "staff" : "mainMenu",
				),
			};
		}
		return {
			text: "Бот DENTE подключен. Отсканируйте QR из приложения клиники или отправьте одноразовый код вручную, чтобы безопасно привязать чат. Дальше выбирайте действия кнопками ниже; команды нужны только как запасной вариант. Медицинские документы открываются только в защищенном портале.",
			replyMarkup: safeCommandKeyboard(settings, "start"),
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (normalizedCommand === "/help" || callbackAction === "dente:help") {
		return {
			text: "DENTE работает кнопками: расписание, документы, памятки, связь с администратором, отзыв и карта клиники. Команды остаются запасным вариантом. Медицинские данные в Telegram не отправляются.",
			replyMarkup: safeCommandKeyboard(settings, "help"),
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (normalizedCommand === "/privacy" || callbackAction === "dente:privacy") {
		return {
			text: "DENTE по умолчанию не отправляет диагнозы, КТ, рентген, планы лечения и налоговые PDF через Telegram. В Telegram уходят только безопасные уведомления и ссылки.",
			replyMarkup: safeCommandKeyboard(settings, "privacy"),
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (normalizedCommand === "/clinic" || callbackAction === "dente:clinic") {
		return {
			text: `Попросите администратора открыть DENTE и показать QR-код подключения. QR сам откроет бот с одноразовым кодом; если камера недоступна, код можно отправить сюда вручную. Портал клиники: ${portal}.`,
			replyMarkup: safeCommandKeyboard(settings, "clinic"),
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
	if (
		normalizedCommand === "/schedule" ||
		normalizedCommand === "/appointments" ||
		callbackAction === "dente:schedule"
	) {
		const scheduleReply = buildDenteTelegramLinkedScheduleReply(
			chatFingerprintValue,
			scope,
			settings,
		);
		return {
			text: scheduleReply.text,
			replyMarkup:
				scheduleReply.replyMarkup ??
				safeCommandKeyboard(
					settings,
					scheduleReply.linked ? "linked" : "rejected",
				),
			photoUrl: patientMenuCardPhoto(settings, "appointment"),
		};
	}
	if (
		normalizedCommand === "/documents" ||
		normalizedCommand === "/docs" ||
		callbackAction === "dente:documents"
	) {
		return documentsReplyFor(settings);
	}
	if (callbackAction === "dente:tax") {
		if (!telegramFeatureEnabled(settings, "tax_document_request"))
			return featureDisabledReplyFor(settings, "Налоговые запросы");
		return documentSubmenuReplyFor(
			settings,
			"tax",
			createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope),
		);
	}
	if (callbackAction === "dente:billing") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Финансовые документы");
		return documentSubmenuReplyFor(
			settings,
			"billing",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"billing",
				scope,
			),
		);
	}
	if (callbackAction === "dente:medical-docs") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Медицинские документы");
		return documentSubmenuReplyFor(
			settings,
			"medical",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"medical",
				scope,
			),
		);
	}
	if (callbackAction === "dente:patient-forms") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Формы пациента");
		return documentSubmenuReplyFor(
			settings,
			"patientForms",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"patientForms",
				scope,
			),
		);
	}
	if (
		normalizedCommand === "/care" ||
		normalizedCommand === "/instructions" ||
		normalizedCommand === "/recommendations" ||
		callbackAction === "dente:care"
	) {
		if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
			return featureDisabledReplyFor(settings, "Памятки после приема");
		return careReplyFor(settings);
	}
	const callbackCareTopic = callbackAction
		? telegramCareCallbackTopicByAction[callbackAction]
		: null;
	if (callbackCareTopic) {
		if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
			return featureDisabledReplyFor(settings, "Памятки после приема");
		return careTopicReplyFor(
			settings,
			callbackCareTopic,
			createDenteTelegramCareRequest(
				chatFingerprintValue,
				callbackCareTopic,
				scope,
			),
		);
	}
	if (
		normalizedCommand === "/contact" ||
		normalizedCommand === "/call" ||
		callbackAction === "dente:contact"
	) {
		return contactRequestReplyFor(settings, chatFingerprintValue, scope);
	}
	if (normalizedCommand === "/review" || callbackAction === "dente:review") {
		return reviewReplyFor(settings);
	}
	if (
		normalizedCommand === "/map" ||
		normalizedCommand === "/maps" ||
		callbackAction === "dente:map"
	) {
		return mapReplyFor(settings);
	}
	if (!command && !callbackAction)
		return freeTextReplyFor(settings, chatFingerprintValue, messageText, scope);
	return {
		text: "DENTE принял сообщение. Выберите безопасное действие кнопками ниже.",
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}