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
			{ command: "portfolio", description: "Портфолио до/после" },
			{ command: "calculator", description: "Калькулятор улыбки" },
			{ command: "chief_doctor", description: "Запись к главному врачу" },
			{ command: "coordinator", description: "Персональный VIP-координатор" },
			{ command: "care", description: "Памятки после имплантации" },
			{ command: "help", description: "Справка и контакты" },
		],
		icon: "🌟",
		badge: "VIP & Эстетика",
		targetAudience: "Клиники эстетической стоматологии, виниры, All-on-4, реставрации",
		description:
			"Акцент на статус, визуальное портфолио улыбок, интерактивный калькулятор реставраций и персонального координатора.",
		tone: "premium",
		avatarText: "✨",
		avatarGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
		headerTitle: "DENTE VIP Aesthetic Studio",
		botUsernameDemo: "dente_vip_bot",
		highlightFeatures: [
			"Калькулятор улыбки (виниры & импланты)",
			"Портфолио клинических кейсов До/После",
			"Прямой вызов персонального куратора",
			"WebApp онлайн-записи на 3D-моделирование",
		],
		defaultWelcomeText:
			"Добро пожаловать в клинику эстетической стоматологии DENTE VIP.\n\nМы создаем безупречные улыбки: керамические виниры E-max, цифровая имплантация All-on-4 и щадящее отбеливание. Чем мы можем быть полезны сегодня?",
		primaryActionLabel: "✨ Записаться на 3D-моделирование",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Добро пожаловать в клинику эстетической стоматологии DENTE VIP.\n\nМы создаем безупречные улыбки: керамические виниры E-max, цифровая имплантация All-on-4 и щадящее отбеливание. Чем мы можем быть полезны сегодня?",
				bannerUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "✨ Записаться на 3D-моделирование", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "💎 Калькулятор улыбки", action: "screen:calculator" },
						{ text: "📸 Портфолио До / После", action: "screen:portfolio" },
					],
					[
						{ text: "🦷 All-on-4 & Имплантация", action: "screen:implants" },
						{ text: "👩‍💼 Связь с куратором", action: "screen:concierge" },
					],
					[
						{ text: "📍 Локация и VIP-парковка", action: "screen:location" },
					],
				],
			},
			calculator: {
				id: "calculator",
				title: "Калькулятор улыбки",
				text: "💎 Онлайн-расчет преображения улыбки:\n\n1. Керамические виниры E-max (Германия) — от 32 000 ₽ / зуб\n2. Имплантация Nobel Biocare All-on-4 — от 280 000 ₽ / челюсть\n3. Лазерное отбеливание Zoom 4 — 28 000 ₽\n\nВ стоимость входит цифровая диагностика и гарантийный паспорт.",
				buttons: [
					[
						{ text: "📅 Рассчитать с главным врачом", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			portfolio: {
				id: "portfolio",
				title: "Портфолио До / После",
				text: "📸 Примеры преображения пациентов DENTE VIP:\n\n• Кейс №142: Тотальная реабилитация E-max (20 виниров, цвет BL2)\n• Кейс №89: All-on-4 с циркониевым мостом за 3 дня\n• Кейс №204: Закрытие диастемы без обточки\n\nВсе работы выполнены штатными мастерами высшей категории.",
				buttons: [
					[
						{ text: "✨ Хочу такую же улыбку", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			implants: {
				id: "implants",
				title: "All-on-4 & Имплантация",
				text: "🦷 Цифровая имплантация в DENTE VIP:\n\n— Навигационные хирургические шаблоны (точность до 0.1 мм)\n— Несъемные зубы за 1 день (Immediate Loading)\n— Пожизненная гарантия на швейцарские импланты\n— Лечение в седации (во сне) без стресса.",
				buttons: [
					[
						{ text: "📅 Записаться на КТ-диагностику", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			concierge: {
				id: "concierge",
				title: "Персональный куратор",
				text: "👩‍💼 Ваш персональный координатор заботы:\n\nКуратор согласует удобное время, забронирует место на закрытой парковке и ответит на любые клинические и финансовые вопросы.\n\nТелефон: +7 (999) 000-01-01 (Елена)",
				buttons: [
					[
						{ text: "📞 Позвонить куратору", action: "action:call_concierge", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Локация и парковка",
				text: "📍 Адрес клиники: Кутузовский проспект, 24\n\n🚗 Для пациентов работает бесплатная охраняемая парковка (шлагбаум открывается звонком боту).\n⏰ График: Ежедневно 09:00 — 21:00.",
				buttons: [
					[
						{ text: "🗺️ Открыть на Яндекс.Картах", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "✨ Запись в DENTE VIP Studio:\n\nВыберите удобный способ: через фирменное WebApp-приложение с выбором времени онлайн либо через звонок куратору.",
				buttons: [
					[
						{ text: "🚀 Открыть онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
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
		name: "Семейная & Детство",
		tagline: "Забота о всей семье, адаптационный прием детей без боли и слез",
		commandCount: 6,
		commandsList: [
			{ command: "start", description: "Главное меню семейной клиники" },
			{ command: "cito", description: "Экстренная помощь при острой боли" },
			{ command: "kids_memo", description: "Памятка родителям" },
			{ command: "doctor_chat", description: "Чат с дежурным врачом" },
			{ command: "family_card", description: "Семейный счет и бонусы" },
			{ command: "help", description: "Справка и контакты" },
		],
		icon: "👨‍👩‍👧‍👦",
		badge: "Забота & Без боли",
		targetAudience: "Семейные клиники, детская стоматология, адаптационный прием",
		description:
			"Теплый заботливый тон, кнопка CITO для острой боли, детские памятки родителям и игровая комната.",
		tone: "caring",
		avatarText: "🧸",
		avatarGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
		headerTitle: "Семейная стоматология «ДентеСемья»",
		botUsernameDemo: "dente_family_bot",
		highlightFeatures: [
			"Кнопка экстренной помощи «⚡ Острая боль (CITO)»",
			"Памятка родителям: как подготовить ребенка к приему",
			"Уведомления о плановых семейных чекапах",
			"Прямой чат с дежурным детским доктором",
		],
		defaultWelcomeText:
			"Здравствуйте! Мы рады приветствовать вас в семейной стоматологии «ДентеСемья». Мы лечим зубы взрослым и малышам абсолютно без слез и страха.\n\nЕсли у вас или ребенка острая боль — нажмите кнопку CITO ниже, примем вне очереди!",
		primaryActionLabel: "👨‍👩‍👧‍👦 Записать семью на осмотр",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Здравствуйте! Мы рады приветствовать вас в семейной стоматологии «ДентеСемья». Мы лечим зубы взрослым и малышам абсолютно без слез и страха.\n\nЕсли у вас или ребенка острая боль — нажмите кнопку CITO ниже, дежурный врач примет вне очереди!",
				bannerUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "⚡ Острая боль CITO (без очереди!)", action: "screen:cito_pain", isDanger: true },
					],
					[
						{ text: "👨‍👩‍👧‍👦 Записаться на семейный осмотр", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "🧸 Детский прием & Игровая", action: "screen:kids" },
						{ text: "🦷 Цены и семейные скидки", action: "screen:prices" },
					],
					[
						{ text: "📍 Как к нам добраться", action: "screen:location" },
						{ text: "💬 Задать вопрос врачу", action: "screen:doctor_chat" },
					],
				],
			},
			cito_pain: {
				id: "cito_pain",
				title: "Острая боль CITO",
				text: "⚡ Экстренная помощь при острой боли:\n\nДежурный стоматолог готов принять вас или ребенка сегодня без ожидания очереди!\n\n1. Не грейте больное место\n2. Не прикладывайте аспирин к десне\n3. Позвоните в регистратуру прямо сейчас:",
				buttons: [
					[
						{ text: "📞 Позвонить дежурному врачу (+7 999 000-02-02)", action: "action:call_cito", isDanger: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			kids: {
				id: "kids",
				title: "Детская стоматология",
				text: "🧸 Как мы лечим деток без слез:\n\n• Адаптационный визит-знакомство (подарки, мультики на потолке)\n• Лечение во сне (ингаляционный наркоз Севоран с реаниматологом)\n• Лечение кариеса без бормашины Icon\n• Уроки гигиены в игровой форме.",
				buttons: [
					[
						{ text: "🎈 Записать малыша на адаптацию", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Цены и скидки",
				text: "🦷 Прозрачные семейные цены:\n\n• Первичный семейный осмотр + план лечения — 0 ₽\n• Детская пломба (световая) — от 3 200 ₽\n• Лечение взрослого кариеса — от 4 500 ₽\n• Профгигиена всей семьи — скидка 15% при записи от 2 человек.",
				buttons: [
					[
						{ text: "📅 Записаться со скидкой 15%", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			doctor_chat: {
				id: "doctor_chat",
				title: "Чат с врачом",
				text: "💬 Онлайн-дежурство:\n\nОпишите ваши симптомы или отправьте фотографию зуба/десны. Дежурный доктор ответит в течение 10 минут в рабочее время клиники.",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Как добраться",
				text: "📍 Адрес: ул. Семейная, д. 10 (3 минуты от метро)\n\n🍼 Удобный пандус для детских колясок, комната матери и ребенка.\n⏰ Работаем без выходных: 08:30 — 21:00.",
				buttons: [
					[
						{ text: "🗺️ Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "👨‍👩‍👧‍👦 Онлайн-запись в семейную клинику:\n\nВыберите доктора и удобное время в интерактивном мини-приложении.",
				buttons: [
					[
						{ text: "🚀 Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
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
			{ command: "start", description: "Главное меню орто-центра" },
			{ command: "quiz", description: "Тест: брекеты или элайнеры" },
			{ command: "sos", description: "SOS: отклеился замок / колет дуга" },
			{ command: "tracker", description: "Трекер ношения кап" },
			{ command: "scan", description: "Запись на 3D-сканирование" },
			{ command: "help", description: "Справка и контакты" },
		],
		icon: "🦷",
		badge: "Брекеты & Элайнеры",
		targetAudience: "Ортодонтические клиники, исправление прикуса, элайнеры Spark/FlexiLigner",
		description:
			"Интерактивный тест «Брекеты или элайнеры?», SOS-инструкции при отклейке замка и трекер замены кап.",
		tone: "concise",
		avatarText: "📐",
		avatarGradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
		headerTitle: "Орто-Центр «DENTE Align»",
		botUsernameDemo: "dente_ortho_bot",
		highlightFeatures: [
			"Тест за 1 минуту: «Брекеты или прозрачные элайнеры?»",
			"🚨 SOS: отклеился брекет / натерла дуга — экстренные шаги",
			"Напоминания о плановой замене сета кап",
			"3D-симуляция результата лечения улыбки",
		],
		defaultWelcomeText:
			"Привет! Это ортодонтический бот центра «DENTE Align». Мы специализируемся на исправлении прикуса у подростков и взрослых.\n\nПройдите быстрый тест, чтобы узнать, что подойдет именно вам, или запишитесь на сканирование зубов.",
		primaryActionLabel: "📐 Записаться на 3D-сканирование",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Привет! Это ортодонтический бот центра «DENTE Align». Мы специализируемся на исправлении прикуса у подростков и взрослых.\n\nПройдите быстрый тест, чтобы узнать, что подойдет именно вам, или запишитесь на сканирование зубов.",
				bannerUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "📐 Записаться на 3D-сканирование", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "❓ Тест: Брекеты или Элайнеры?", action: "screen:quiz" },
						{ text: "🚨 SOS: отклеился брекет", action: "screen:sos_bracket", isDanger: true },
					],
					[
						{ text: "💎 Стоимость лечения под ключ", action: "screen:prices" },
						{ text: "📱 Трекер ношения кап", action: "screen:tracker" },
					],
					[
						{ text: "📍 Контакты центра", action: "screen:location" },
					],
				],
			},
			quiz: {
				id: "quiz",
				title: "Тест: Брекеты vs Элайнеры",
				text: "❓ Что вам больше подходит?\n\n• Прозрачные элайнеры незаметны, снимаются во время еды, идеальны для публичных людей и активного спорта.\n• Керамические или металлические брекеты справляются со сложнейшими скелетными аномалиями и работают 24/7 без дисциплины снятия.\n\nТочный ответ даст цифровой сетап главного ортодонта.",
				buttons: [
					[
						{ text: "🎯 Хочу консультацию ортодонта", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			sos_bracket: {
				id: "sos_bracket",
				title: "SOS: отклеился брекет",
				text: "🚨 Экстренная инструкция пациента:\n\n1. Если брекет висит на дуге — не отрывайте его, заклейте ортодонтическим воском из вашего стартового набора.\n2. Если колет конец дуги — также изолируйте воском или ватным шариком.\n3. Запишитесь на внеплановый осмотр (замена/подклейка замка займет 10 минут):",
				buttons: [
					[
						{ text: "⚡ Записаться на подклейку брекета", action: "screen:appointment", isDanger: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Цены на ортодонтию",
				text: "💎 Фиксированная стоимость под ключ (без скрытых доплат):\n\n• Металлическая брекет-система Damon Q — от 140 000 ₽\n• Эстетические сапфировые брекеты — от 185 000 ₽\n• Курс прозрачных элайнеров — от 210 000 ₽\n\nДоступна беспроцентная рассрочка на весь срок лечения (от 8 500 ₽/мес).",
				buttons: [
					[
						{ text: "📅 Рассчитать рассрочку на приеме", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			tracker: {
				id: "tracker",
				title: "Трекер кап",
				text: "📱 Контроль ношения элайнеров:\n\nДля достижения эффекта носите капы не менее 22 часов в сутки. Бот может присылать напоминания о смене элайнеров на следующий шаг каждые 14 дней.",
				buttons: [
					[
						{ text: "🔔 Включить напоминания", action: "screen:appointment" },
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Контакты",
				text: "📍 Ортодонтический центр DENTE Align\nметро Маяковская, ул. Тверская 15\n⏰ Пн-Сб 09:00 — 20:00\n📞 +7 (495) 123-45-67",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на сканирование",
				text: "📐 Онлайн-запись на 3D-сканирование iTero:\n\nВы увидите будущую идеальную улыбку еще до начала лечения!",
				buttons: [
					[
						{ text: "🚀 Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
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
		name: "Частный кабинет / Соло-врач",
		tagline: "Личный бренд, прямое общение с врачом без посредников",
		commandCount: 5,
		commandsList: [
			{ command: "start", description: "Главное меню доктора" },
			{ command: "schedule", description: "Свободные окна приема" },
			{ command: "prices", description: "Прозрачный прайс-лист" },
			{ command: "consultation", description: "Личный вопрос доктору" },
			{ command: "help", description: "Адрес и контакты кабинета" },
		],
		icon: "🩺",
		badge: "Личный бренд & Без очередей",
		targetAudience: "Соло-стоматологи, аренда кресла, частная практика 1-2 врача",
		description:
			"Прямой контакт с любимым доктором, прозрачные свободные окна, честный фиксированный прайс без навязанных услуг.",
		tone: "concise",
		avatarText: "👨‍⚕️",
		avatarGradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
		headerTitle: "Доктор Смирнов | Частная практика",
		botUsernameDemo: "dr_smirnov_dental_bot",
		highlightFeatures: [
			"Календарь свободных окон врача в реальном времени",
			"Прямая связь лично с доктором без колл-центров",
			"Фиксированный прайс без скрытых накруток",
			"Личный контроль гарантии и качества лечения",
		],
		defaultWelcomeText:
			"Здравствуйте! Я доктор Смирнов Алексей. Рад приветствовать вас в моем персональном боте.\n\nЗдесь вы можете посмотреть мои ближайшие свободные окна на прием, ознакомиться с прозрачным прайсом и записаться без посредников и очередей.",
		primaryActionLabel: "🗓️ Выбрать свободное окно к доктору",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Здравствуйте! Я доктор Смирнов Алексей. Рад приветствовать вас в моем персональном боте.\n\nЗдесь вы можете посмотреть мои ближайшие свободные окна на прием, ознакомиться с прозрачным прайсом и записаться напрямую без посредников и очередей.",
				bannerUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "🗓️ Свободные окна на этой неделе", action: "screen:free_slots", isPrimary: true },
					],
					[
						{ text: "🦷 Прайс-лист услуг врача", action: "screen:prices" },
						{ text: "👨‍⚕️ Опыт, дипломы и отзывы", action: "screen:about" },
					],
					[
						{ text: "💬 Написать лично доктору", action: "screen:direct_chat" },
						{ text: "📍 Адрес кабинета и проход", action: "screen:location" },
					],
				],
			},
			free_slots: {
				id: "free_slots",
				title: "Свободные окна врача",
				text: "🗓️ Ближайшие окна на прием:\n\n• Завтра (Вторник): 11:30, 16:00\n• Четверг: 14:00, 18:30\n• Суббота: 10:00\n\nПрием длится 60–90 минут без спешки, один пациент за раз.",
				buttons: [
					[
						{ text: "📅 Занять окно в расписании", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			prices: {
				id: "prices",
				title: "Честный прайс-лист",
				text: "🦷 Прямые цены частной практики:\n\n• Первичный осмотр с микроскопом — 1 500 ₽\n• Лечение сложного кариеса (всё включено) — 5 500 ₽\n• Эндодонтия (лечение каналов под микроскопом) — от 9 000 ₽\n• Ультразвуковая гигиена + AirFlow — 4 500 ₽\n\nНикаких сюрпризов в чеке: план согласуется до начала работы.",
				buttons: [
					[
						{ text: "🗓️ Записаться к доктору", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			about: {
				id: "about",
				title: "О докторе",
				text: "👨‍⚕️ Смирнов Алексей Владимирович:\n\n• Стаж практики: 14 лет\n• Специализация: терапия под микроскопом, эстетическая реставрация\n• Член Европейской эндодонтической ассоциации (ESE)\n• Рейтинг 5.0 на ПроДокторов (180+ отзывов).",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			direct_chat: {
				id: "direct_chat",
				title: "Личный контакт",
				text: "💬 Прямая связь:\n\nВы можете задать вопрос доктору напрямую. Доктор отвечает лично в перерывах между приёмами.\n\nTelegram: @dr_smirnov_direct",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Где находится кабинет",
				text: "📍 Москва, Проспект Мира, 40 (отдельный вход, домофон 5)\n⏰ Прием строго по предварительной записи.",
				buttons: [
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "🗓️ Выберите удобное время для визита в интерактивном окне записи:",
				buttons: [
					[
						{ text: "🚀 Записаться онлайн (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
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
		name: "Стандартная клиника",
		tagline: "Полный спектр стоматологии для взрослых и детей",
		commandCount: 6,
		commandsList: [
			{ command: "start", description: "Главное меню клиники" },
			{ command: "services", description: "Направления и услуги" },
			{ command: "doctors", description: "Наши врачи" },
			{ command: "booking", description: "Запись на прием" },
			{ command: "reviews", description: "Отзывы пациентов" },
			{ command: "help", description: "Контакты и проезд" },
		],
		icon: "🏥",
		badge: "Универсальный стандарт",
		targetAudience: "Многопрофильные стоматологические клиники, сетевые филиалы",
		description:
			"Все отделения (терапия, хирургия, ортопедия, имплантация), запись к профильным специалистам, отзывы и навигация.",
		tone: "concise",
		avatarText: "🏥",
		avatarGradient: "linear-gradient(135deg, #0d9488 0%, #115e59 100%)",
		headerTitle: "Стоматологический центр «DENTE»",
		botUsernameDemo: "dente_clinic_bot",
		highlightFeatures: [
			"Каталог всех направлений лечения и врачей клиники",
			"Быстрая запись на первичный приём и диагностику",
			"Отзывы пациентов на Яндекс и 2GIS",
			"Интерактивная карта проезда и расписание работы",
		],
		defaultWelcomeText:
			"Здравствуйте! Вас приветствует стоматологический центр «DENTE».\n\nМы оказываем полный спектр стоматологических услуг для взрослых и детей: от профессиональной гигиены до имплантации и исправления прикуса. Чем мы можем вам помочь?",
		primaryActionLabel: "📅 Записаться на прием к врачу",
		screens: {
			root: {
				id: "root",
				title: "Главное меню",
				text: "Здравствуйте! Вас приветствует стоматологический центр «DENTE».\n\nМы оказываем полный спектр стоматологических услуг для взрослых и детей: от профессиональной гигиены до имплантации и исправления прикуса. Чем мы можем вам помочь?",
				bannerUrl: "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=720&q=80",
				buttons: [
					[
						{ text: "📅 Записаться на прием к врачу", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "🦷 Направления и цены", action: "screen:services" },
						{ text: "👨‍⚕️ Врачи и специалисты", action: "screen:doctors" },
					],
					[
						{ text: "📍 Схема проезда и часы", action: "screen:location" },
						{ text: "⭐ Отзывы наших пациентов", action: "screen:reviews" },
					],
				],
			},
			services: {
				id: "services",
				title: "Направления и цены",
				text: "🦷 Основные направления клиники DENTE:\n\n1. Терапия и реставрация — от 3 900 ₽\n2. Имплантация зубов под ключ — от 35 000 ₽\n3. Ортопедия (коронки, виниры) — от 18 000 ₽\n4. Профессиональная гигиена — 4 200 ₽\n5. Хирургия и удаление зубов — от 2 800 ₽\n\nТочная стоимость определяется на бесплатном первичном осмотре.",
				buttons: [
					[
						{ text: "📅 Записаться на консультацию", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			doctors: {
				id: "doctors",
				title: "Врачи клиники",
				text: "👨‍⚕️ Команда DENTE:\n\n• Смирнова Е.А. — Главный врач, терапевт-ортопед (стаж 16 лет)\n• Воронов Д.М. — Хирург-имплантолог (стаж 12 лет, 3000+ имплантов)\n• Ковалева А.С. — Детский стоматолог (стаж 9 лет)\n• Морозов И.В. — Ортодонт, специалист по элайнерам.",
				buttons: [
					[
						{ text: "📅 Выбрать врача и записаться", action: "screen:appointment", isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			location: {
				id: "location",
				title: "Как добраться",
				text: "📍 г. Москва, Ленинградский проспект, 36\n🚗 Бесплатная парковка для пациентов клиники\n⏰ Пн-Вс: 09:00 — 21:00\n📞 +7 (495) 900-80-70",
				buttons: [
					[
						{ text: "🗺️ Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
			reviews: {
				id: "reviews",
				title: "Отзывы",
				text: "⭐ Отзывы пациентов о DENTE:\n\n• Яндекс.Карты: 4.9 из 5.0 (450+ отзывов)\n• 2GIS: 4.9 из 5.0 (280+ отзывов)\n• ПроДокторов: «Клиника года 2025»\n\n98% пациентов рекомендуют нас друзьям и близким.",
				buttons: [
					[
						{ text: "« Назад в главное меню", action: "screen:root" },
					],
				],
			},
			appointment: {
				id: "appointment",
				title: "Запись на прием",
				text: "📅 Выберите услугу и удобное время для визита в клинику DENTE:",
				buttons: [
					[
						{ text: "🚀 Онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true },
					],
					[
						{ text: "« Назад в меню", action: "screen:root" },
					],
				],
			},
		},
	},
};
