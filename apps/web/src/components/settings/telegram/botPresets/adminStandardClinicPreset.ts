import type { BotPreset } from "./botPresetTypes";

export const standardClinicPreset: BotPreset = {
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
	description: "Все клинические отделения (терапия, хирургия, ортопедия, имплантация), запись к профильным специалистам, отзывы и навигация.",
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
				[{ text: "Записаться на прием к врачу", action: "screen:appointment", isPrimary: true }],
				[{ text: "Направления и прейскурант", action: "screen:services" }, { text: "Врачи и специалисты", action: "screen:doctors" }],
				[{ text: "Схема проезда и график", action: "screen:location" }, { text: "Отзывы пациентов", action: "screen:reviews" }],
			],
		},
		services: {
			id: "services",
			title: "Направления и прейскурант",
			text: "Основные клинические отделения DENTE:\n\n1. Терапевтическая стоматология — от 3 900 ₽\n2. Дентальная имплантация — от 35 000 ₽\n3. Ортопедическое лечение (коронки, виниры) — от 18 000 ₽\n4. Профессиональная гигиена полости рта — 4 200 ₽\n5. Хирургическая стоматология — от 2 800 ₽\n\nТочная стоимость фиксируется в предварительном плане лечения.",
			buttons: [
				[{ text: "Записаться на консультацию", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в главное меню", action: "screen:root" }],
			],
		},
		doctors: {
			id: "doctors",
			title: "Врачи клиники",
			text: "Команда специалистов DENTE:\n\n• Смирнова Е.А. — Главный врач, стоматолог-терапевт (стаж 16 лет)\n• Воронов Д.М. — Стоматолог-хирург, имплантолог (стаж 12 лет)\n• Ковалева А.С. — Детский стоматолог (стаж 9 лет)\n• Морозов И.В. — Стоматолог-ортодонт.",
			buttons: [
				[{ text: "Выбрать специалиста и записаться", action: "screen:appointment", isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
		location: {
			id: "location",
			title: "Как добраться",
			text: "Адрес: г. Москва, Ленинградский проспект, 36\nПарковка для пациентов клиники\nГрафик: Пн-Вс: 09:00 — 21:00\nТелефон: +7 (495) 900-80-70",
			buttons: [
				[{ text: "Яндекс.Карты", action: "action:open_maps", url: "https://maps.yandex.ru" }, { text: "« Назад в меню", action: "screen:root" }],
			],
		},
		reviews: {
			id: "reviews",
			title: "Отзывы",
			text: "Оценки работы DENTE на независимых площадках:\n\n• Яндекс.Карты: 4.9 из 5.0\n• 2GIS: 4.9 из 5.0\n• ПроДокторов: высокий рейтинг пациентов\n\nБолее 95% пациентов рекомендуют клинику близким.",
			buttons: [[{ text: "« Назад в главное меню", action: "screen:root" }]],
		},
		appointment: {
			id: "appointment",
			title: "Запись на прием",
			text: "Выберите отделение и удобное время для визита в клинику DENTE:",
			buttons: [
				[{ text: "Онлайн-запись (Mini App)", action: "action:open_webapp", webApp: true, isPrimary: true }],
				[{ text: "« Назад в меню", action: "screen:root" }],
			],
		},
	},
};
