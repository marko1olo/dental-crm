import type { BotPreset } from "./botPresetTypes";

export const premiumPreset: BotPreset = {
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
	description: "Акцент на статус, визуальное портфолио реставраций, интерактивный расчет плана лечения и персонального координатора.",
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
				[{ text: "Записаться на 3D-моделирование", action: "screen:appointment", isPrimary: true }],
				[{ text: "Калькулятор плана лечения", action: "screen:calculator" }, { text: "Портфолио До и После", action: "screen:portfolio" }],
				[{ text: "All-on-4 & Имплантация", action: "screen:implants" }, { text: "Связь с координатором", action: "screen:concierge" }],
				[{ text: "Адрес и парковка", action: "screen:location" }],
			],
		},
		calculator: {
			id: "calculator",
			title: "Калькулятор плана лечения",
			text: "Онлайн-расчет преображения улыбки:\n\n1. Керамические виниры E-max — от 32 000 ₽ / зуб\n2. Имплантация All-on-4 — от 280 000 ₽ / челюсть\n3. Лазерное отбеливание — 28 000 ₽\n\nВ стоимость входит цифровая диагностика и гарантийный паспорт.",
			buttons: [
				[{ text: "Консультация главного врача", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
		portfolio: {
			id: "portfolio",
			title: "Портфолио До и После",
			text: "Примеры клинических работ DENTE VIP:\n\n• Кейс №142: Тотальная реабилитация E-max (20 виниров, цвет BL2)\n• Кейс №89: All-on-4 с циркониевым мостом за 3 дня\n• Кейс №204: Закрытие диастемы прямой реставрацией\n\nВсе работы выполнены штатными специалистами высшей категории.",
			buttons: [
				[{ text: "Записаться на консультацию", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		implants: {
			id: "implants",
			title: "All-on-4 & Имплантация",
			text: "Цифровая имплантация в DENTE VIP:\n\n— Навигационные хирургические шаблоны (точность до 0.1 мм)\n— Несъемные конструкции за 1 день (немедленная нагрузка)\n— Сертификаты подлинности и пожизненная гарантия\n— Лечение в седации под контролем анестезиолога.",
			buttons: [
				[{ text: "Записаться на КТ-диагностику", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		concierge: {
			id: "concierge",
			title: "Персональный координатор",
			text: "Ваш персональный координатор клиники:\n\nКоординатор согласует удобное время, забронирует место на парковке и ответит на организационные и финансовые вопросы.\n\nТелефон: +7 (999) 000-01-01 (Елена)",
			buttons: [
				[{ text: "Позвонить координатору", action: "action:call_concierge", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		location: {
			id: "location",
			title: "Локация и парковка",
			text: "Адрес клиники: Кутузовский проспект, 24\n\nДля пациентов работает охраняемая парковка клиники.\nГрафик: Ежедневно 09:00 — 21:00.",
			buttons: [
				[{ text: "Открыть на Яндекс.Картах", action: "action:open_maps", url: "https://maps.yandex.ru" }, { text: "« Назад в меню", action: "screen:root" }],
			],
		},
		appointment: {
			id: "appointment",
			title: "Запись на прием",
			text: "Запись в DENTE VIP Studio:\n\nВыберите удобный способ: через защищенное WebApp-приложение с выбором времени онлайн либо звонком координатору.",
			buttons: [
				[{ text: "Открыть онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
	},
};
