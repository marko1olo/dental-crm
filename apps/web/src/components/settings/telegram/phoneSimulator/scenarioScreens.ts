import type { BotPreset, BotSimulatorScreen } from "../telegramBotPresets";

export function getClinicalScreens(title: string): Record<string, BotSimulatorScreen> {
	return {
		booking: {
			id: "booking",
			title: "Онлайн-запись 24/7",
			text: `Онлайн-запись на приём в «${title}»:\n\n1. Выберите направление или специалиста\n2. Укажите удобную дату и время\n3. Запись моментально появится в расписании клиники.`,
			buttons: [
				[{ text: "Терапия / Осмотр (Смирнова Е.А.)", action: "action:select_service", isPrimary: true }],
				[
					{ text: "Эстетика & Виниры (Барабаш С.В.)", action: "action:select_service" },
					{ text: "Детское отделение (адаптация)", action: "action:select_service" },
				],
				[{ text: "Ближайший слот: Завтра 14:00", action: "action:confirm_slot", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		reminders: {
			id: "reminders",
			title: "Напоминание о приёме",
			text: `Напоминание о визите:\n\nЗдравствуйте, Анна! Напоминаем о вашем приёме завтра в 14:00 к врачу Смирновой Е.А. (Терапия, кабинет 2).\n\nКлиника: «${title}»\nПожалуйста, подтвердите визит или перенесите время:`,
			buttons: [
				[{ text: "Да, я буду (Подтвердить)", action: "action:confirm_visit", isPrimary: true }],
				[
					{ text: "Перенести на другой день", action: "action:reschedule" },
					{ text: "Показать маршрут", action: "action:open_maps" },
				],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		reviews: {
			id: "reviews",
			title: "Сбор отзывов и NPS",
			text: `Спасибо, что доверили здоровье вашей улыбки клинике «${title}»!\n\nКак прошёл ваш сегодняшний визит? Будем благодарны за оценку на независимых порталах. Это помогает нам становиться лучше!`,
			buttons: [
				[{ text: "Отлично, всё понравилось", action: "action:rate_5", isPrimary: true }],
				[
					{ text: "Яндекс.Карты (Бонус 500 ₽)", action: "action:open_yandex", url: "https://maps.yandex.ru" },
					{ text: "2ГИС", action: "action:open_2gis", url: "https://2gis.ru" },
				],
				[{ text: "ПроДокторов", action: "action:open_prodoctorov", url: "https://prodoctorov.ru" }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		price_faq: {
			id: "price_faq",
			title: "Прейскурант и FAQ",
			text: `Прейскурант услуг клиники «${title}»:\n\n• Первичный осмотр и КТ — 0 ₽ (по акции)\n• Лечение кариеса под микроскопом — от 4 500 ₽\n• Профессиональная гигиена AirFlow — 6 000 ₽\n• Имплантация зуба под ключ — от 35 000 ₽\n\nВсе цены фиксируются в плане лечения до начала манипуляций.`,
			buttons: [
				[{ text: "Записаться на осмотр", action: "screen:booking", isPrimary: true }],
				[
					{ text: "Поэтапная оплата 0%", action: "action:installment" },
					{ text: "Гарантия на лечение", action: "action:warranty" },
				],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		admin_chat: {
			id: "admin_chat",
			title: "Связь с администратором",
			text: `Вы переключены на дежурного администратора клиники «${title}».\n\nАдминистратор подключилась к диалогу и ответит вам в течение 1–2 минут. Напишите ваш вопрос:`,
			buttons: [
				[{ text: "Позвонить в регистратуру", action: "action:call_concierge", isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
	};
}

export function resolveActiveScreen(
	screenId: string,
	preset: BotPreset,
	clinicalScreens: Record<string, BotSimulatorScreen>,
): BotSimulatorScreen {
	const fallbackScreen: BotSimulatorScreen = preset.screens.root ?? {
		id: "root",
		title: "Главное меню",
		text: preset.defaultWelcomeText,
		buttons: [],
	};
	return clinicalScreens[screenId] ?? preset.screens[screenId] ?? fallbackScreen;
}
