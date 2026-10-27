import type { BotPreset } from "./botPresetTypes";

export const orthodonticsPreset: BotPreset = {
	id: "orthodontics",
	backendPresetId: "orthodontics",
	name: "Ортодонтия & Элайнеры",
	tagline: "Исправление прикуса, брекет-системы и прозрачные элайнеры",
	commandCount: 6,
	commandsList: [
		{ command: "start", description: "Главное меню ортодонтического центра" },
		{ command: "quiz", description: "Анкета: брекеты или элайнеры" },
		{ command: "sos", description: "Экстренная помощь: отклейка замка или дуга" },
		{ command: "tracker", description: "Контроль ношения элайнеров" },
		{ command: "scan", description: "Запись на 3D-сканирование" },
		{ command: "help", description: "Справка и контакты" },
	],
	icon: "Activity",
	badge: "Брекеты & Элайнеры",
	targetAudience: "Ортодонтические центры, исправление прикуса, элайнеры",
	description: "Клиническая анкета «Брекеты или элайнеры?», инструкции при смещении аппаратуры и контроль графика смены кап.",
	tone: "concise",
	avatarText: "ALIGN",
	avatarGradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
	headerTitle: "Ортодонтический центр «DENTE Align»",
	botUsernameDemo: "dente_ortho_bot",
	highlightFeatures: [
		"Клиническая анкета: «Брекет-система или элайнеры»",
		"Инструкция при смещении элементов брекет-системы",
		"Напоминания о графике смены элайнеров",
		"3D-визуализация прогнозируемого результата лечения",
	],
	defaultWelcomeText:
		"Здравствуйте! Это виртуальный ассистент ортодонтического центра «DENTE Align». Мы специализируемся на исправлении прикуса у подростков и взрослых.\n\nПройдите клиническую анкету, чтобы определить подходящую систему, или запишитесь на 3D-сканирование.",
	primaryActionLabel: "Записаться на 3D-сканирование",
	screens: {
		root: {
			id: "root",
			title: "Главное меню",
			text: "Здравствуйте! Это виртуальный ассистент ортодонтического центра «DENTE Align». Мы специализируемся на исправлении прикуса у подростков и взрослых.\n\nПройдите клиническую анкету, чтобы определить подходящую систему, или запишитесь на 3D-сканирование.",
			bannerUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=720&q=80",
			buttons: [
				[{ text: "Записаться на 3D-сканирование", action: "screen:appointment", isPrimary: true }],
				[{ text: "Анкета: Брекеты или Элайнеры?", action: "screen:quiz" }, { text: "Смещение замка или дуги", action: "screen:sos_bracket", isDanger: true }],
				[{ text: "Стоимость комплексного лечения", action: "screen:prices" }, { text: "Контроль ношения кап", action: "screen:tracker" }],
				[{ text: "Контакты центра", action: "screen:location" }],
			],
		},
		quiz: {
			id: "quiz",
			title: "Анкета: Брекеты vs Элайнеры",
			text: "Сравнение ортодонтических систем:\n\n• Прозрачные элайнеры незаметны, снимаются во время приема пищи и чистки зубов.\n• Вестибулярные брекеты показаны при выраженных скелетных аномалиях и обеспечивают постоянное воздействие 24/7.\n\nОкончательный план лечения составляет врач-ортодонт по результатам расчетов.",
			buttons: [
				[{ text: "Консультация ортодонта", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
		sos_bracket: {
			id: "sos_bracket",
			title: "Смещение замка или дуги",
			text: "Памятка пациента при дискомфорте:\n\n1. При отклейке замка зафиксируйте его ортодонтическим воском из индивидуального набора.\n2. При давлении конца дуги изолируйте участок воском.\n3. Запишитесь на внеплановый визит для коррекции:",
			buttons: [
				[{ text: "Записаться на внеплановую коррекцию", action: "screen:appointment", isDanger: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		prices: {
			id: "prices",
			title: "Стоимость ортодонтии",
			text: "Стоимость комплексного курса лечения:\n\n• Металлическая брекет-система — от 140 000 ₽\n• Эстетическая брекет-система — от 185 000 ₽\n• Курс прозрачных элайнеров — от 210 000 ₽\n\nВозможна поэтапная оплата на весь период лечения.",
			buttons: [
				[{ text: "Рассчитать план лечения", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		tracker: {
			id: "tracker",
			title: "Контроль ношения кап",
			text: "График ношения элайнеров:\n\nДля прогнозируемого результата капы необходимо носить не менее 22 часов в сутки. Бот напоминает о смене шага каждые 14 дней.",
			buttons: [[{ text: "Включить напоминания о капах", action: "screen:appointment" }, { text: "« Назад в меню", action: "screen:root" }]],
		},
		location: {
			id: "location",
			title: "Контакты",
			text: "Ортодонтический центр DENTE Align\nул. Тверская, 15\nГрафик: Пн-Сб 09:00 — 20:00\nТелефон: +7 (495) 123-45-67",
			buttons: [[{ text: "« Назад в меню", action: "screen:root" }]],
		},
		appointment: {
			id: "appointment",
			title: "Запись на сканирование",
			text: "Онлайн-запись на оптическое 3D-сканирование:\n\nОзнакомьтесь с цифровой моделью зубных рядов до начала ортодонтического лечения.",
			buttons: [
				[{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
	},
};
