import type { BotPreset } from "./botPresetTypes";

export const soloDoctorPreset: BotPreset = {
	id: "solo_doctor",
	backendPresetId: "solo_doctor",
	name: "Частная практика / Соло-врач",
	tagline: "Личный бренд, прямое взаимодействие с лечащим врачом",
	commandCount: 5,
	commandsList: [
		{ command: "start", description: "Главное меню врача" },
		{ command: "schedule", description: "Свободные интервалы приема" },
		{ command: "prices", description: "Прейскурант услуг" },
		{ command: "consultation", description: "Клинический вопрос доктору" },
		{ command: "help", description: "Адрес и контакты кабинета" },
	],
	icon: "Stethoscope",
	badge: "Частная практика",
	targetAudience: "Соло-стоматологи, аренда кабинета, индивидуальная врачебная практика",
	description: "Прямое взаимодействие с врачом, наглядные свободные окна в расписании, фиксированный прейскурант.",
	tone: "concise",
	avatarText: "ВРАЧ",
	avatarGradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
	headerTitle: "Доктор Смирнов | Частная практика",
	botUsernameDemo: "dr_smirnov_dental_bot",
	highlightFeatures: [
		"Свободные интервалы врача в режиме реального времени",
		"Прямая связь с лечащим врачом",
		"Фиксированный прейскурант без скрытых наценок",
		"Персональный контроль качества и гарантийных обязательств",
	],
	defaultWelcomeText:
		"Здравствуйте! Я доктор Смирнов Алексей. Рад приветствовать вас в моем персональном ассистенте.\n\nЗдесь вы можете посмотреть свободные интервалы приема, ознакомиться с прейскурантом и записаться на визит.",
	primaryActionLabel: "Выбрать свободное окно к доктору",
	screens: {
		root: {
			id: "root",
			title: "Главное меню",
			text: "Здравствуйте! Я доктор Смирнов Алексей. Рад приветствовать вас в моем персональном ассистенте.\n\nЗдесь вы можете посмотреть свободные интервалы приема, ознакомиться с прейскурантом и записаться на визит.",
			bannerUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=720&q=80",
			buttons: [
				[{ text: "Свободные окна на этой неделе", action: "screen:free_slots", isPrimary: true }],
				[{ text: "Прейскурант услуг врача", action: "screen:prices" }, { text: "Квалификация и сертификаты", action: "screen:about" }],
				[{ text: "Написать лично доктору", action: "screen:direct_chat" }, { text: "Адрес кабинета и схема прохода", action: "screen:location" }],
			],
		},
		free_slots: {
			id: "free_slots",
			title: "Свободные окна врача",
			text: "Ближайшие интервалы приема:\n\n• Вторник: 11:30, 16:00\n• Четверг: 14:00, 18:30\n• Суббота: 10:00\n\nПродолжительность приема составляет 60–90 минут.",
			buttons: [
				[{ text: "Забронировать окно в расписании", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
		prices: {
			id: "prices",
			title: "Прейскурант услуг",
			text: "Прейскурант частной практики:\n\n• Первичный осмотр с дентальным микроскопом — 1 500 ₽\n• Лечение кариеса под микроскопом — 5 500 ₽\n• Эндодонтическое лечение каналов — от 9 000 ₽\n• Комплексная профессиональная гигиена — 4 500 ₽\n\nПлан лечения согласуется до начала манипуляций.",
			buttons: [
				[{ text: "Записаться на прием", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		about: {
			id: "about",
			title: "О докторе",
			text: "Смирнов Алексей Владимирович:\n\n• Стаж клинической практики: 14 лет\n• Специализация: терапевтическая стоматология, реставрация под микроскопом\n• Член Европейской эндодонтической ассоциации (ESE)\n• Рейтинг 5.0 на независимых медицинских порталах.",
			buttons: [[{ text: "« Назад в меню", action: "screen:root" }]],
		},
		direct_chat: {
			id: "direct_chat",
			title: "Личный контакт",
			text: "Прямая связь с лечащим врачом:\n\nВы можете задать вопрос доктору. Ответ поступит в перерыве между приемами.\n\nTelegram: @dr_smirnov_direct",
			buttons: [[{ text: "« Назад в главное меню", action: "screen:root" }]],
		},
		location: {
			id: "location",
			title: "Адрес кабинета",
			text: "Москва, Проспект Мира, 40 (отдельный вход, домофон 5)\nПрием ведется по предварительной записи.",
			buttons: [[{ text: "« Назад в меню", action: "screen:root" }]],
		},
		appointment: {
			id: "appointment",
			title: "Запись на прием",
			text: "Выберите удобное время для визита в интерактивном окне записи:",
			buttons: [
				[{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
	},
};
