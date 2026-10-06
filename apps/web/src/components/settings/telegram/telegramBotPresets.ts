import type { TelegramBotPresetId } from "@dental/shared";

export type BotTone = "premium" | "caring" | "concise";

export interface BotInlineButton {
	text: string;
	action: string;
	isPrimary?: boolean;
	isDanger?: boolean;
	url?: string;
	webApp?: boolean;
}

export interface BotSimulatorScreen {
	id: string;
	title: string;
	text: string;
	bannerUrl?: string;
	buttons: BotInlineButton[][];
}

export interface BotPreset {
	id: "premium" | "family" | "orthodontics" | "solo_doctor" | "standard_clinic";
	backendPresetId: TelegramBotPresetId;
	name: string;
	tagline: string;
	commandCount: number;
	icon: string;
	badge: string;
	targetAudience: string;
	description: string;
	tone: BotTone;
	avatarText: string;
	avatarGradient: string;
	headerTitle: string;
	botUsernameDemo: string;
	highlightFeatures: string[];
	defaultWelcomeText: string;
	primaryActionLabel: string;
	commandsList: { command: string; description: string }[];
	screens: Record<string, BotSimulatorScreen>;
}

export const CLINICAL_BOT_PRESETS: Record<BotPreset["id"], BotPreset> = {
	premium: {
		id: "premium",
		backendPresetId: "premium_implants",
		name: "Премиум & Эстетика / Имплантология",
		tagline: "Цифровая эстетика, All-on-4 и имплантация премиум-класса",
		commandCount: 7,
		commandsList: [
			{ command: "start", description: "Главное меню премиум-клиники" },
			{ command: "portfolio", description: "Портфолио до и после" },
			{ command: "calculator", description: "Калькулятор плана лечения" },
			{ command: "chief_doctor", description: "Запись к главному врачу" },
			{ command: "coordinator", description: "Персональный координатор" },
			{ command: "care", description: "Памятки после имплантации" },
			{ command: "help", description: "Справка и контакты" },
		],
		icon: "Sparkles",
		badge: "VIP & Эстетика",
		targetAudience: "Клиники эстетической стоматологии, виниры, All-on-4, реставрации",
		description:
			"Акцент на статус, визуальное портфолио реставраций, интерактивный расчет плана лечения и персонального координатора.",
		tone: "premium",
		avatarText: "VIP",
		avatarGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
		headerTitle: "DENTE VIP Aesthetic Studio",
		botUsernameDemo: "dente_vip_bot",
		highlightFeatures: [
			"Калькулятор реставрации (виниры и имплантаты)",
			"Портфолио клинических кейсов До и После",
			"Прямой вызов персонального координатора",
			"WebApp онлайн-записи на 3D-моделирование",
		],
		defaultWelcomeText:
			"Добро пожаловать в клинику эстетической стоматологии DENTE VIP.\n\nМы создаем безупречные улыбки: керамические виниры E-max, цифровая имплантация All-on-4 и щадящее отбеливание. Чем мы можем помочь сегодня?",
		primaryActionLabel: "Записаться на 3D-моделирование",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Добро пожаловать в клинику эстетической стоматологии DENTE VIP.\n\nМы создаем безупречные улыбки: керамические виниры E-max, цифровая имплантация All-on-4 и щадящее отбеливание. Чем мы можем помочь сегодня?",
				bannerUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "Записаться на 3D-моделирование", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "Калькулятор плана лечения", action: "screen:calculator" },
						{ text: "Портфолио До и После", action: "screen:portfolio" },
					],
					[
						{ text: "All-on-4 & Имплантация", action: "screen:implants" },
						{ text: "Связь с координатором", action: "screen:concierge" },
					],
					[
						{ text: "Адрес и парковка", action: "screen:location" },
					],
				],
			},
			calculator: {
				id: "calculator",
				title: "Калькулятор плана лечения",
				text: "Онлайн-расчет преображения улыбки:\n\n1. Керамические виниры E-max — от 32 000 ₽ / зуб\n2. Имплантация All-on-4 — от 280 000 ₽ / челюсть\n3. Лазерное отбеливание — 28 000 ₽\n\nВ стоимость входит цифровая диагностика и гарантийный паспорт.",
				buttons: [
					[
						{ text: "Консультация главного врача", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			portfolio: {
				id: "portfolio",
				title: "Портфолио До и После",
				text: "Примеры клинических работ DENTE VIP:\n\n• Кейс №142: Тотальная реабилитация E-max (20 виниров, цвет BL2)\n• Кейс №89: All-on-4 с циркониевым мостом за 3 дня\n• Кейс №204: Закрытие диастемы прямой реставрацией\n\nВсе работы выполнены штатными специалистами высшей категории.",
				buttons: [
					[
						{ text: "Записаться на консультацию", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			implants: {
				id: "implants",
				title: "All-on-4 & Имплантация",
				text: "Цифровая имплантация в DENTE VIP:\n\n— Навигационные хирургические шаблоны (точность до 0.1 мм)\n— Несъемные конструкции за 1 день (немедленная нагрузка)\n— Сертификаты подлинности и пожизненная гарантия\n— Лечение в седации под контролем анестезиолога.",
				buttons: [
					[
						{ text: "Записаться на КТ-диагностику", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			concierge: {
				id: "concierge",
				title: "Персональный координатор",
				text: "Ваш персональный координатор клиники:\n\nКоординатор согласует удобное время, забронирует место на парковке и ответит на организационные и финансовые вопросы.\n\nТелефон: +7 (999) 000-01-01 (Елена)",
				buttons: [
					[
						{ text: "Позвонить координатору", action: "action:call_concierge", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Локация и парковка",
				text: "Адрес клиники: Кутузовский проспект, 24\n\nДля пациентов работает охраняемая парковка клиники.\nГрафик: Ежедневно 09:00 — 21:00.",
				buttons: [
					[
						{ text: "Открыть на Яндекс.Картах", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "Запись в DENTE VIP Studio:\n\nВыберите удобный способ: через защищенное WebApp-приложение с выбором времени онлайн либо звонком координатору.",
				buttons: [
					[
						{ text: "Открыть онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
		},
	},

	family: {
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
		description:
			"Внимательный тон, кнопка CITO для экстренной помощи, памятки родителям и семейные программы.",
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
					[
						{ text: "Экстренная помощь CITO (острая боль)", action: "screen:cito_pain", isDanger: true },
					],
					[
						{ text: "Записаться на семейный осмотр", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "Детское отделение & Адаптация", action: "screen:kids" },
						{ text: "Прейскурант и семейные программы", action: "screen:prices" },
					],
					[
						{ text: "Как к нам добраться", action: "screen:location" },
						{ text: "Вопрос дежурному врачу", action: "screen:doctor_chat" },
					],
				],
			},
			cito_pain: {
				id: "cito_pain",
				title: "Острая боль CITO",
				text: "Экстренная помощь при острой боли:\n\nДежурный стоматолог готов принять вас сегодня в приоритетном порядке!\n\n1. Не грейте воспаленную область\n2. Не прикладывайте лекарства к слизистой оболочке\n3. Свяжитесь с клиникой немедленно:",
				buttons: [
					[
						{ text: "Позвонить дежурному врачу (+7 999 000-02-02)", action: "action:call_cito", isDanger: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			kids: {
				id: "kids",
				title: "Детское отделение",
				text: "Адаптационный прием детей:\n\n• Знакомство с кабинетом в игровой форме\n• Современные методы психологической адаптации\n• Лечение без применения бормашины по методике Icon\n• Уроки гигиены и индивидуальный подбор средств ухода.",
				buttons: [
					[
						{ text: "Записать ребенка на адаптационный прием", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Прейскурант и программы",
				text: "Прозрачные семейные программы:\n\n• Первичный семейный осмотр с составлением плана — 0 ₽\n• Детская световая пломба — от 3 200 ₽\n• Лечение кариеса у взрослых — от 4 500 ₽\n• Профессиональная гигиена — специальный семейный тариф.",
				buttons: [
					[
						{ text: "Записаться по семейной программе", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			doctor_chat: {
				id: "doctor_chat",
				title: "Чат с врачом",
				text: "Связь с дежурным врачом:\n\nОпишите симптомы. Дежурный врач ответит в течение 10–15 минут в часы работы клиники.",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Как добраться",
				text: "Адрес: ул. Семейная, д. 10 (3 минуты от метро)\n\nПандус для колясок, детская зона ожидания.\nГрафик: ежедневно 08:30 — 21:00.",
				buttons: [
					[
						{ text: "Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "Онлайн-запись в семейную клинику:\n\nВыберите врача и удобное время в интерактивном приложении.",
				buttons: [
					[
						{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
		},
	},

	orthodontics: {
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
		description:
			"Клиническая анкета «Брекеты или элайнеры?», инструкции при смещении аппаратуры и контроль графика смены кап.",
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
					[
						{ text: "Записаться на 3D-сканирование", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "Анкета: Брекеты или Элайнеры?", action: "screen:quiz" },
						{ text: "Смещение замка или дуги", action: "screen:sos_bracket", isDanger: true },
					],
					[
						{ text: "Стоимость комплексного лечения", action: "screen:prices" },
						{ text: "Контроль ношения кап", action: "screen:tracker" },
					],
					[
						{ text: "Контакты центра", action: "screen:location" },
					],
				],
			},
			quiz: {
				id: "quiz",
				title: "Анкета: Брекеты vs Элайнеры",
				text: "Сравнение ортодонтических систем:\n\n• Прозрачные элайнеры незаметны, снимаются во время приема пищи и чистки зубов.\n• Вестибулярные брекеты показаны при выраженных скелетных аномалиях и обеспечивают постоянное воздействие 24/7.\n\nОкончательный план лечения составляет врач-ортодонт по результатам расчетов.",
				buttons: [
					[
						{ text: "Консультация ортодонта", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			sos_bracket: {
				id: "sos_bracket",
				title: "Смещение замка или дуги",
				text: "Памятка пациента при дискомфорте:\n\n1. При отклейке замка зафиксируйте его ортодонтическим воском из индивидуального набора.\n2. При давлении конца дуги изолируйте участок воском.\n3. Запишитесь на внеплановый визит для коррекции:",
				buttons: [
					[
						{ text: "Записаться на внеплановую коррекцию", action: "screen:appointment", isDanger: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Стоимость ортодонтии",
				text: "Стоимость комплексного курса лечения:\n\n• Металлическая брекет-система — от 140 000 ₽\n• Эстетическая брекет-система — от 185 000 ₽\n• Курс прозрачных элайнеров — от 210 000 ₽\n\nВозможна поэтапная оплата на весь период лечения.",
				buttons: [
					[
						{ text: "Рассчитать план лечения", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			tracker: {
				id: "tracker",
				title: "Контроль ношения кап",
				text: "График ношения элайнеров:\n\nДля прогнозируемого результата капы необходимо носить не менее 22 часов в сутки. Бот напоминает о смене шага каждые 14 дней.",
				buttons: [
					[
						{ text: "Включить напоминания о капах", action: "screen:appointment" },
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Контакты",
				text: "Ортодонтический центр DENTE Align\nул. Тверская, 15\nГрафик: Пн-Сб 09:00 — 20:00\nТелефон: +7 (495) 123-45-67",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на сканирование",
				text: "Онлайн-запись на оптическое 3D-сканирование:\n\nОзнакомьтесь с цифровой моделью зубных рядов до начала ортодонтического лечения.",
				buttons: [
					[
						{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
		},
	},

	solo_doctor: {
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
		description:
			"Прямое взаимодействие с врачом, наглядные свободные окна в расписании, фиксированный прейскурант.",
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
					[
						{ text: "Свободные окна на этой неделе", action: "screen:free_slots", isPrimary: true },
					],
					[
						{ text: "Прейскурант услуг врача", action: "screen:prices" },
						{ text: "Квалификация и сертификаты", action: "screen:about" },
					],
					[
						{ text: "Написать лично доктору", action: "screen:direct_chat" },
						{ text: "Адрес кабинета и схема прохода", action: "screen:location" },
					],
				],
			},
			free_slots: {
				id: "free_slots",
				title: "Свободные окна врача",
				text: "Ближайшие интервалы приема:\n\n• Вторник: 11:30, 16:00\n• Четверг: 14:00, 18:30\n• Суббота: 10:00\n\nПродолжительность приема составляет 60–90 минут.",
				buttons: [
					[
						{ text: "Забронировать окно в расписании", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Прейскурант услуг",
				text: "Прейскурант частной практики:\n\n• Первичный осмотр с дентальным микроскопом — 1 500 ₽\n• Лечение кариеса под микроскопом — 5 500 ₽\n• Эндодонтическое лечение каналов — от 9 000 ₽\n• Комплексная профессиональная гигиена — 4 500 ₽\n\nПлан лечения согласуется до начала манипуляций.",
				buttons: [
					[
						{ text: "Записаться на прием", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			about: {
				id: "about",
				title: "О докторе",
				text: "Смирнов Алексей Владимирович:\n\n• Стаж клинической практики: 14 лет\n• Специализация: терапевтическая стоматология, реставрация под микроскопом\n• Член Европейской эндодонтической ассоциации (ESE)\n• Рейтинг 5.0 на независимых медицинских порталах.",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			direct_chat: {
				id: "direct_chat",
				title: "Личный контакт",
				text: "Прямая связь с лечащим врачом:\n\nВы можете задать вопрос доктору. Ответ поступит в перерыве между приемами.\n\nTelegram: @dr_smirnov_direct",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Адрес кабинета",
				text: "Москва, Проспект Мира, 40 (отдельный вход, домофон 5)\nПрием ведется по предварительной записи.",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "Выберите удобное время для визита в интерактивном окне записи:",
				buttons: [
					[
						{ text: "Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
		},
	},

	standard_clinic: {
		id: "standard_clinic",
		backendPresetId: "universal_clinic",
		name: "Стоматологическая клиника",
		tagline: "Полный спектр стоматологической помощи для взрослых и детей",
		commandCount: 6,
		commandsList: [
			{ command: "start", description: "Главное меню клиники" },
			{ command: "services", description: "Направления и услуги" },
			{ command: "doctors", description: "Врачи клиники" },
			{ command: "booking", description: "Запись на прием" },
			{ command: "reviews", description: "Отзывы пациентов" },
			{ command: "help", description: "Контакты и проезд" },
		],
		icon: "Building2",
		badge: "Клинический стандарт",
		targetAudience: "Многопрофильные стоматологические клиники, сетевые филиалы",
		description:
			"Все клинические отделения (терапия, хирургия, ортопедия, имплантация), запись к профильным специалистам, отзывы и навигация.",
		tone: "concise",
		avatarText: "DENTE",
		avatarGradient: "linear-gradient(135deg, #0d9488 0%, #115e59 100%)",
		headerTitle: "Стоматологический центр «DENTE»",
		botUsernameDemo: "dente_clinic_bot",
		highlightFeatures: [
			"Каталог клинических направлений и врачей клиники",
			"Запись на первичный прием и комплексную диагностику",
			"Отзывы пациентов на независимых картах",
			"Схема проезда и график работы отделений",
		],
		defaultWelcomeText:
			"Здравствуйте! Вас приветствует стоматологический центр «DENTE».\n\nМы оказываем полный спектр стоматологических услуг: от профессиональной гигиены до дентальной имплантации и ортодонтии. Чем мы можем помочь?",
		primaryActionLabel: "Записаться на прием к врачу",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Здравствуйте! Вас приветствует стоматологический центр «DENTE».\n\nМы оказываем полный спектр стоматологических услуг: от профессиональной гигиены до дентальной имплантации и ортодонтии. Чем мы можем помочь?",
				bannerUrl: "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "Записаться на прием к врачу", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "Направления и прейскурант", action: "screen:services" },
						{ text: "Врачи и специалисты", action: "screen:doctors" },
					],
					[
						{ text: "Схема проезда и график", action: "screen:location" },
						{ text: "Отзывы пациентов", action: "screen:reviews" },
					],
				],
			},
			services: {
				id: "services",
				title: "Направления и прейскурант",
				text: "Основные клинические отделения DENTE:\n\n1. Терапевтическая стоматология — от 3 900 ₽\n2. Дентальная имплантация — от 35 000 ₽\n3. Ортопедическое лечение (коронки, виниры) — от 18 000 ₽\n4. Профессиональная гигиена полости рта — 4 200 ₽\n5. Хирургическая стоматология — от 2 800 ₽\n\nТочная стоимость фиксируется в предварительном плане лечения.",
				buttons: [
					[
						{ text: "Записаться на консультацию", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			doctors: {
				id: "doctors",
				title: "Врачи клиники",
				text: "Команда специалистов DENTE:\n\n• Смирнова Е.А. — Главный врач, стоматолог-терапевт (стаж 16 лет)\n• Воронов Д.М. — Стоматолог-хирург, имплантолог (стаж 12 лет)\n• Ковалева А.С. — Детский стоматолог (стаж 9 лет)\n• Морозов И.В. — Стоматолог-ортодонт.",
				buttons: [
					[
						{ text: "Выбрать специалиста и записаться", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Как добраться",
				text: "Адрес: г. Москва, Ленинградский проспект, 36\nПарковка для пациентов клиники\nГрафик: Пн-Вс: 09:00 — 21:00\nТелефон: +7 (495) 900-80-70",
				buttons: [
					[
						{ text: "Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			reviews: {
				id: "reviews",
				title: "Отзывы",
				text: "Оценки работы DENTE на независимых площадках:\n\n• Яндекс.Карты: 4.9 из 5.0\n• 2GIS: 4.9 из 5.0\n• ПроДокторов: высокий рейтинг пациентов\n\nБолее 95% пациентов рекомендуют клинику близким.",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "Выберите отделение и удобное время для визита в клинику DENTE:",
				buttons: [
					[
						{ text: "Онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
		},
	},
};
