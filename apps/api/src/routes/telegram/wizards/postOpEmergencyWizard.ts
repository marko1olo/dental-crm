import type {
	DenteTelegramBotSettings,
	DenteTelegramUpdateKind,
	DenteTelegramVisualCardKey,
} from "@dental/shared";
import {
	denteTelegramVisualCardUrlFor,
	createDenteTelegramCareRequest,
} from "../../../services/telegram/telegramLegacyMemoryStore.js";
import { TelegramBotHostingService } from "../../../services/telegram/TelegramBotHostingService.js";
import type {
	TelegramWebhookReplyPackage,
	DenteTelegramCareRequestTopic,
} from "../types.js";
import {
	portalButton,
	reviewButtons,
	mapButtons,
	mainMenuTelegramRow,
	replyMarkupWithNextActions,
	safeCommandKeyboard,
} from "../telegramKeyboards.js";

export function patientMenuCardPhoto(
	settings: DenteTelegramBotSettings,
	cardKey: DenteTelegramVisualCardKey = "mainMenu",
): string | null {
	return denteTelegramVisualCardUrlFor(settings, cardKey);
}

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
