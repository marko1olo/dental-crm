import type { BotPreset } from "./botPresetTypes";

export const familyPreset: BotPreset = {
	id: "family",
	backendPresetId: "family_pediatric",
	name: "Семейная стоматология",
	tagline: "Забота о всей семье, адаптационный прием и комфортное лечение",
	commandCount: 6,
	commandsList: [
		{ command: "start", description: "Главное меню семейной клиники" },
		{ command: "cito", description: "Экстренная помощь при острой боли" },
		{ command: "kids_memo", description: "Памятка родителям" },
		{ command: "doctor_chat", description: "Связь с дежурным врачом" },
		{ command: "family_card", description: "Семейный счет и баланс" },
		{ command: "help", description: "Справка и контакты" },
	],
	icon: "Users",
	badge: "Забота & Семья",
	targetAudience: "Семейные клиники, детское отделение, адаптационный прием",
	description: "Внимательный тон, кнопка CITO для экстренной помощи, памятки родителям и семейные программы.",
	tone: "caring",
	avatarText: "СЕМЬЯ",
	avatarGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
	headerTitle: "Семейная стоматология «ДентеСемья»",
	botUsernameDemo: "dente_family_bot",
	highlightFeatures: [
		"Кнопка экстренной помощи «Острая боль (CITO)»",
		"Памятка родителям: подготовка ребенка к приему",
		"Уведомления о плановых семейных профилактических визитах",
		"Прямая связь с дежурным врачом клиники",
	],
	defaultWelcomeText:
		"Здравствуйте! Мы рады приветствовать вас в семейной стоматологии «ДентеСемья». Мы заботимся о здоровье зубов всей семьи.\n\nЕсли у вас или вашего ребенка острая боль — нажмите кнопку CITO ниже, примем в приоритетном порядке!",
	primaryActionLabel: "Записать семью на осмотр",
	screens: {
		root: {
			id: "root",
			title: "Главное меню",
			text: "Здравствуйте! Мы рады приветствовать вас в семейной стоматологии «ДентеСемья». Мы заботимся о здоровье зубов всей семьи.\n\nЕсли у вас или вашего ребенка острая боль — нажмите кнопку CITO ниже, дежурный врач примет в приоритетном порядке!",
			bannerUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=720&q=80",
			buttons: [
				[{ text: "Экстренная помощь CITO (острая боль)", action: "screen:cito_pain", isDanger: true }],
				[{ text: "Записаться на семейный осмотр", action: "screen:appointment", isPrimary: true }],
				[{ text: "Детское отделение & Адаптация", action: "screen:kids" }, { text: "Прейскурант и семейные программы", action: "screen:prices" }],
				[{ text: "Как к нам добраться", action: "screen:location" }, { text: "Вопрос дежурному врачу", action: "screen:doctor_chat" }],
			],
		},
		cito_pain: {
			id: "cito_pain",
			title: "Острая боль CITO",
			text: "Экстренная помощь при острой боли:\n\nДежурный стоматолог готов принять вас сегодня в приоритетном порядке!\n\n1. Не грейте воспаленную область\n2. Не прикладывайте лекарства к слизистой оболочке\n3. Свяжитесь с клиникой немедленно:",
			buttons: [
				[{ text: "Позвонить дежурному врачу (+7 999 000-02-02)", action: "action:call_cito", isDanger: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
		kids: {
			id: "kids",
			title: "Детское отделение",
			text: "Адаптационный прием детей:\n\n• Знакомство с кабинетом в игровой форме\n• Современные методы психологической адаптации\n• Лечение без применения бормашины по методике Icon\n• Уроки гигиены и индивидуальный подбор средств ухода.",
			buttons: [
				[{ text: "Записать ребенка на адаптационный прием", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		prices: {
			id: "prices",
			title: "Прейскурант и программы",
			text: "Прозрачные семейные программы:\n\n• Первичный семейный осмотр с составлением плана — 0 ₽\n• Детская световая пломба — от 3 200 ₽\n• Лечение кариеса у взрослых — от 4 500 ₽\n• Профессиональная гигиена — специальный семейный тариф.",
			buttons: [
				[{ text: "Записаться по семейной программе", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		doctor_chat: {
			id: "doctor_chat",
			title: "Чат с врачом",
			text: "Связь с дежурным врачом:\n\nОпишите симптомы. Дежурный врач ответит в течение 10–15 минут в часы работы клиники.",
			buttons: [[{ text: "« Назад в главное меню", action: "screen:root" }]],
		},
		location: {
			id: "location",
			title: "Как добраться",
			text: "Адрес: ул. Семейная, д. 10 (3 минуты от метро)\n\nПандус для колясок, детская зона ожидания.\nГрафик: ежедневно 08:30 — 21:00.",
			buttons: [[{ text: "Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" }, { text: "« Назад в меню", action: "screen:root" }]],
		},
		appointment: {
			id: "appointment",
			title: "Запись на прием",
			text: "Онлайн-запись в семейную клинику:\n\nВыберите врача и удобное время в интерактивном приложении.",
			buttons: [
				[{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
	},
};
