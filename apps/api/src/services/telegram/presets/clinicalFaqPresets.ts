import type {
	PostOpSurveyEvaluationInput,
	PostOpSurveyResult,
	TelegramBotPresetMetadata,
	TriageEvaluationContext,
	TriageEvaluationResult,
	TriageSymptomKey,
} from "./types.js";

// ============================================================================
// LAYER 1: КЛИНИЧЕСКАЯ БАЗА ЗНАНИЙ, FAQ И ТРИАЖ СИМПТОМОВ ПАЦИЕНТОВ
// ============================================================================

/**
 * Архетип универсальной клиники DENTE: терапия, хирургия, ортопедия, отзывы, схема проезда.
 */
export const UNIVERSAL_CLINIC_PRESET: TelegramBotPresetMetadata = {
	id: "universal_clinic",
	name: "Универсальная стоматологическая клиника",
	tagline: "Полный спектр стоматологических услуг для взрослых и детей",
	icon: "🏥",
	targetClinicProfile: "Многопрофильные стоматологические центры, сетевые клиники",
	description:
		"Многопрофильная клиника DENTE: терапия, хирургия, имплантация, ортопедия, ортодонтия, детство, гигиена. Онлайн-запись, отзывы и схема проезда.",
	shortDescription: "Все направления стоматологии, запись на приём, отзывы и схема проезда.",
	commands: [
		{ command: "start", description: "Главное меню клиники" },
		{ command: "services", description: "Каталог всех направлений" },
		{ command: "booking", description: "Онлайн-запись на приём" },
		{ command: "reviews", description: "Отзывы и рейтинг клиники" },
		{ command: "directions", description: "Схема проезда и парковка" },
		{ command: "care", description: "Памятки после лечения" },
		{ command: "help", description: "Справка и контакты" },
	],
	welcomeText: [
		"🏥 <b>Добро пожаловать в стоматологическую клинику DENTE!</b>",
		"",
		"Мы оказываем все виды высококвалифицированной стоматологической помощи:",
		"• <b>Терапия & Микроскоп:</b> лечение кариеса и спасение безнадежных зубов",
		"• <b>Имплантация & Хирургия:</b> безболезненное удаление и восстановление зубов",
		"• <b>Ортопедия:</b> коронки, мосты, керамические вкладки и съемное протезирование",
		"• <b>Ортодонтия:</b> исправление прикуса брекетами и элайнерами",
		"• <b>Профгигиена & Отбеливание:</b> бережная забота о здоровье эмали и десен",
		"",
		"Выберите нужный раздел кнопками ниже:",
	].join("\n"),
	screens: {
		main: {
			id: "main",
			title: "Главное меню клиники",
			text: [
				"🏥 <b>Стоматологическая клиника DENTE</b>",
				"",
				"Современные технологии, опытные врачи и заботливый сервис.",
				"Выберите необходимое действие:",
			].join("\n"),
			parentScreenId: null,
			buttons: [
				[
					{ text: "🦷 Направления и услуги", callback_data: "preset_nav:universal_clinic:services" },
					{ text: "📅 Онлайн-запись на приём", callback_data: "dente:schedule" },
				],
				[
					{ text: "⭐️ Отзывы и рейтинг (4.9)", callback_data: "preset_nav:universal_clinic:reviews" },
					{ text: "📍 Схема проезда и парковка", callback_data: "preset_nav:universal_clinic:directions" },
				],
				[
					{ text: "📋 Памятки после лечения", callback_data: "dente:care" },
					{ text: "👤 Связаться с администратором", callback_data: "triage:human_request" },
				],
			],
		},
		services: {
			id: "services",
			title: "Направления лечения",
			text: [
				"🦷 <b>Клинические отделения клиники DENTE:</b>",
				"",
				"1. <b>Терапия:</b> лечение кариеса, пульпита, периодонтита под микроскопом.",
				"2. <b>Хирургия:</b> атравматичное удаление зубов мудрости, костная пластика.",
				"3. <b>Имплантация:</b> современные титановые имплантаты с приживаемостью 98.7%.",
				"4. <b>Ортопедия:</b> безметалловая керамика, диоксид циркония, виниры.",
				"5. <b>Ортодонтия:</b> металлические/керамические брекеты, элайнеры.",
				"6. <b>Профгигиена:</b> снятие зубного камня ультразвуком + полировка Air-Flow.",
			].join("\n"),
			parentScreenId: "main",
			buttons: [
				[
					{ text: "📅 Записаться на консультацию", callback_data: "dente:schedule" },
				],
				[
					{ text: "🧮 Интерактивный триаж симптомов", callback_data: "triage:root" },
				],
			],
		},
		reviews: {
			id: "reviews",
			title: "Отзывы пациентов",
			text: [
				"⭐️ <b>Рейтинг клиники DENTE на независимых картах: 4.9 из 5.0</b>",
				"",
				"Более 850 проверенных отзывов реальных пациентов:",
				"• <b>Яндекс.Карты:</b> 4.9 ★★★★★ («Лучшая стоматология района»)",
				"• <b>2ГИС:</b> 4.9 ★★★★★ (Высокий рейтинг доверия)",
				"• <b>ПроДокторов:</b> Победитель в номинации «Топ-10 частных клиник»",
				"",
				"Мы ценим ваше доверие и благодарны за каждый теплый отзыв!",
			].join("\n"),
			parentScreenId: "main",
			buttons: [
				[
					{ text: "✍️ Оставить отзыв о визите", callback_data: "dente:review" },
				],
				[
					{ text: "📅 Записаться на приём", callback_data: "dente:schedule" },
				],
			],
		},
		directions: {
			id: "directions",
			title: "Схема проезда и парковка",
			text: [
				"📍 <b>Как добраться в клинику DENTE:</b>",
				"",
				"• <b>Пешком:</b> 5 минут от метро, удобный отдельный вход с улицы, 1 этаж (без крутых лестниц).",
				"• <b>На автомобиле:</b> бесплатная гостевая парковка под шлагбаумом прямо перед входом (назовите администратору номер авто при звонке).",
				"• <b>График работы:</b> Ежедневно с 09:00 до 21:00 без выходных.",
			].join("\n"),
			parentScreenId: "main",
			buttons: [
				[
					{ text: "🗺 Открыть карту клиники", callback_data: "dente:map" },
				],
				[
					{ text: "📞 Позвонить на ресепшен", callback_data: "triage:human_request" },
				],
			],
		},
	},
};

// ============================================================================
// КЛИНИЧЕСКИЙ ТРИАЖ СИМПТОМОВ И CITO МАРКЕР (СТАР РЕКОМЕНДАЦИИ)
// ============================================================================

/**
 * Экспертная оценка симптомов пациента для правильной сортировки и алертов.
 */
export function evaluateTriageSymptom(
	symptomKey: TriageSymptomKey,
	_context?: TriageEvaluationContext,
): TriageEvaluationResult {
	switch (symptomKey) {
		case "acute_pain_cito":
			return {
				severity: "cito_emergency",
				isCito: true,
				clinicalGuidance:
					"Острая пульсирующая боль указывает на острый пульпит или острый периодонтит. Требуется неотложная помощь CITO в день обращения.",
				suggestedSlotType: "emergency_cito_slot",
				firstAidAdvice: [
					"КАТЕГОРИЧЕСКИ НЕ ГРЕЙТЕ ЩЕКУ И ДЕСНУ (тепло усиливает гнойное воспаление)!",
					"Примите таблетку НПВП (Ибупрофен 400 мг / Кетонал 50 мг / Нимесил).",
					"Приложите холодный компресс к щеке снаружи через полотенце на 10-15 минут.",
					"Не кладите таблетки анальгина или аспирина на десну (риск химического некроза слизистой).",
				],
				alertStaffText:
					"🚨 ВНИМАНИЕ: Пациент заявляет об острой боли (CITO!). Необходим экстренный прием дежурного врача!",
			};

		case "broken_tooth_restoration":
			return {
				severity: "urgent_same_day",
				isCito: false,
				clinicalGuidance:
					"Скол коронковой части зуба или выпадение пломбы. При наличии острого края — временная защита воском.",
				suggestedSlotType: "therapy_restoration_slot",
				firstAidAdvice: [
					"Закройте острый край кусочком ортодонтического воска или чистой жевательной резинки.",
					"Не жуйте твердую пищу на стороне сколотого зуба.",
					"Пришлите фото скола прямо в чат для предварительной оценки доктором.",
				],
				alertStaffText: "🦷 Обращение: скол зуба / выпадение пломбы. Требуется терапевт-реставратор.",
			};

		case "gum_bleeding_perio":
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance:
					"Кровоточивость десен — симптом гингивита или пародонтита из-за микробной биопленки.",
				suggestedSlotType: "hygiene_perio_slot",
				firstAidAdvice: [
					"Не прекращайте чистить зубы, используйте мягкую щетку (Soft).",
					"Используйте антисептический ополаскиватель с хлоргексидином 0.05% или травами.",
					"Запишитесь на ультразвуковую чистку и Air-Flow.",
				],
				alertStaffText: null,
			};

		case "aesthetic_smile_veneers":
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance: "Эстетическая реабилитация: керамические виниры, отбеливание или коронки.",
				suggestedSlotType: "consultation_aesthetic_slot",
				firstAidAdvice: [
					"Подготовьте фотографии улыбки, которая вам нравится.",
					"На консультации будет проведено цифровое сканирование и примерка формы (Mock-up).",
				],
				alertStaffText: null,
			};

		case "kids_adaptation_visit":
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance: "Первичный детский адаптационный приём без применения бормашины.",
				suggestedSlotType: "pediatric_adaptation_slot",
				firstAidAdvice: [
					"Не используйте слова «не бойся» и «укол».",
					"Приходите в первой половине дня, когда ребёнок выспался и сыт.",
				],
				alertStaffText: null,
			};

		case "orthodontic_alignment":
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance: "Исправление прикуса и скученности зубов: брекеты или элайнеры.",
				suggestedSlotType: "orthodontic_scan_slot",
				firstAidAdvice: [
					"На консультации проводится высокоточное 3D сканирование челюстей iTero.",
				],
				alertStaffText: null,
			};

		case "hygiene_recall":
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance: "Плановая профессиональная гигиена полости рта (Air-Flow + УЗ).",
				suggestedSlotType: "hygiene_airflow_slot",
				firstAidAdvice: [
					"После гигиены необходимо соблюдать «белую диету» в течение 48 часов.",
				],
				alertStaffText: null,
			};

		case "general_consultation":
		default:
			return {
				severity: "routine_planned",
				isCito: false,
				clinicalGuidance: "Первичный осмотр врача-стоматолога с комплексной диагностикой.",
				suggestedSlotType: "general_consultation_slot",
				firstAidAdvice: [
					"При наличии рентген-снимков или КЛКТ возьмите их с собой на приём.",
				],
				alertStaffText: null,
			};
	}
}

// ============================================================================
// ПОСЛЕОПЕРАЦИОННЫЙ ОПРОС (RECOVERY SURVEY DAY 1 / DAY 3)
// ============================================================================

/**
 * Автоматизированная оценка послеоперационного состояния пациента на 1-й и 3-й день.
 * Если боль >= 4 или есть тревожные симптомы (температура, кровотечение) — генерирует алерт в CRM.
 */
export function evaluatePostOpSurvey(
	input: PostOpSurveyEvaluationInput,
): PostOpSurveyResult {
	const day = input.day;
	const painScore = input.painScore;
	const hasFever = Boolean(input.hasFever);
	const hasHeavyBleeding = Boolean(input.hasHeavyBleeding);
	const hasSevereSwelling = Boolean(input.hasSevereSwelling);

	const hasRedFlags = hasFever || hasHeavyBleeding || (day === 3 && hasSevereSwelling);
	const isCritical = painScore >= 4 || hasRedFlags;

	if (isCritical) {
		const reasons: string[] = [];
		if (painScore >= 4) reasons.push(`высокий уровень боли (${painScore}/5)`);
		if (hasFever) reasons.push("температура выше 38°C");
		if (hasHeavyBleeding) reasons.push("продолжающееся кровотечение");
		if (hasSevereSwelling) reasons.push("нарастающий отек на 3-й день");

		return {
			isCriticalAlert: true,
			patientMessage: [
				"⚠️ <b>Внимание: ваше обращение передано дежурному врачу!</b>",
				"",
				"Мы зафиксировали ваши симптомы. Дежурный врач клиники свяжется с вами в течение 10–15 минут для уточнения самочувствия и назначения корректирующей терапии.",
				"",
				"<b>Срочные меры до звонка врача:</b>",
				"• Не грейте место операции ни в коем случае!",
				"• Примите обезболивающий препарат, назначенный хирургом.",
				"• При кровотечении плотно прикусите стерильный марлевый тампон на 20 минут.",
				"• Если самочувствие резко ухудшается — немедленно звоните в клинику или 112.",
			].join("\n"),
			alertDoctorText: `🚨 КРИТИЧЕСКИЙ АЛЕРТ: Пациент после операции на день ${day} сообщает: ${reasons.join(", ")}! Необходим срочный звонок!`,
			requiresSameDayCallback: true,
		};
	}

	// Нормальное течение послеоперационного периода
	const dayAdvice =
		day === 1
			? "В первые 24 часа умеренная тянущая боль и нарастание отека к вечеру — нормальная физиологическая реакция организма на операцию. Прикладывайте холод к щеке через салфетку по 15 минут."
			: "К 3-му дню отёк достигает максимума и начинает плавно спадать. Продолжайте соблюдать щадящую диету и делать ротовые ванночки с антисептиком.";

	return {
		isCriticalAlert: false,
		patientMessage: [
			"✅ <b>Спасибо за ответ! Ваше восстановление проходит по плану.</b>",
			"",
			dayAdvice,
			"",
			"Соблюдайте назначения вашего лечащего врача. При возникновении вопросов вы всегда можете написать нам сюда!",
		].join("\n"),
		alertDoctorText: null,
		requiresSameDayCallback: false,
	};
}

// ============================================================================
// ИНСТРУКЦИЯ ОНБОРДИНГА @BotFather ЗА 2 МИНУТЫ
// ============================================================================

/**
 * Генерация пошаговой Markdown-инструкции подключения бота через @BotFather.
 */
export function getBotFatherGuideMarkdown(
	preset: TelegramBotPresetMetadata,
): string {
	return [
		`# 🤖 Как запустить Telegram-бота для клиники за 2 минуты (Бесплатно)`,
		``,
		`Выбранный архетип: **${preset.icon} ${preset.name}**`,
		`*${preset.tagline}*`,
		``,
		`### Шаг 1. Откройте официальный бот Telegram @BotFather`,
		`1. Перейдите по ссылке: [https://t.me/BotFather](https://t.me/BotFather)`,
		`2. Нажмите кнопку **Start** (или отправьте команду \`/start\`).`,
		``,
		`### Шаг 2. Создайте нового бота`,
		`1. Отправьте команду \`/newbot\`.`,
		`2. Введите название вашей клиники (например: *Стоматология ДентЭлит Москва*).`,
		`3. Введите юзернейм бота, заканчивающийся на \`bot\` (например: *dentelite_clinic_bot*).`,
		``,
		`### Шаг 3. Скопируйте API токен и вставьте в CRM`,
		`1. BotFather пришлет сообщение с токеном вида: \`7123456789:AAFlkJ2..._example\`.`,
		`2. Скопируйте этот токен целиком.`,
		`3. Вставьте его в настройках DENTE CRM во вкладке **Интеграции -> Telegram**.`,
		`4. Нажмите кнопку **«Проверить и запустить бота»**.`,
		``,
		`### Что система настроит автоматически на нашем VPS:`,
		`✅ Валидация токена через Telegram Bot API (\`getMe\`).`,
		`✅ Установка меню команд (\`setMyCommands\`) под архетип: ${preset.commands.map((c) => `/${c.command}`).join(", ")}.`,
		`✅ Установка описания бота (\`setMyDescription\`).`,
		`✅ Подключение отказоустойчивого сервиса обработки обращений 24/7.`,
		`✅ Включение In-Place UI (Zero Chat Landfill) и интерактивного триажа пациентов.`,
	].join("\n");
}
