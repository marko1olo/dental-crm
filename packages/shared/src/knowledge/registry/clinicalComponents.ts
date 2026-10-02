import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Clinical CRM Modules — Schedule, Odontogram, Visit Diary, Treatment Plans, Perio Charting
 * Mandates: 8e (Doctor Autonomy), 8b (Anti-Monolith <800 lines), 8n (Solo Doctor Sovereignty)
 */

export const SCHEDULE_GRID_COMPONENT: CrmComponentKnowledge = {
	id: "schedule_grid",
	name: "Сетка расписания приёмов",
	shortName: "Расписание",
	category: "clinical",
	categoryRu: "Клинический приём",
	description:
		"Основной экран администратора и врача для планирования приёмов, управления креслами, быстрой записи пациентов и контроля визитов в реальном времени.",
	route: "schedule",
	primaryRole: ["admin", "doctor", "owner", "all"],
	tier: 1,
	primaryActions: [
		{
			id: "btn-create-appointment",
			label: "+ Запись",
			selector: '[data-testid="btn-create-appointment"], [data-tour="schedule-create-appointment"]',
			hotkey: "Ctrl+N",
			effect: "Открывает модальное окно быстрой записи пациента на свободный слот за 5 секунд без лишних полей.",
			requiresConfirmation: false,
			role: ["admin", "doctor", "all"],
		},
		{
			id: "btn-schedule-today",
			label: "Сегодня",
			selector: '[data-testid="btn-schedule-today"]',
			effect: "Мгновенно центрирует сетку календаря на сегодняшней дате и текущем времени.",
			requiresConfirmation: false,
			role: ["all"],
		},
		{
			id: "quick-status-toggle",
			label: "Смена статуса визита",
			selector: '[data-testid^="quick-status-btn-"]',
			effect: "Быстрый перевод статуса: 'Ожидает приёма' -> 'В кресле' -> 'Завершён' -> 'Не явился' в 1 клик.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
	],
	selectors: {
		gridContainer: '[data-testid="schedule-grid-container"]',
		chairColumns: '[data-testid^="schedule-chair-column-"]',
		appointmentSlot: '[data-testid^="appointment-slot-"]',
		controlCenter: '[data-testid="clinic-control-center-wrapper"]',
	},
	visualGuides: [
		{
			element: "Кнопка создания записи",
			selector: '[data-testid="btn-create-appointment"]',
			description: "Главная акцентная кнопка (Primary CTA) тулбара для оформления пациента.",
			badgeText: "1-клик",
			highlightType: "pulse",
		},
		{
			element: "Слоты расписания",
			selector: '[data-testid^="appointment-slot-"]',
			description: "Карточка приёма с индикацией времени, ФИО и цветного клинического статуса.",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Администратор кликает свободный слот или '+ Запись' -> 2. Вводит телефон/ФИО пациента -> 3. Назначает врача/кресло -> 4. При явке переводит в 'В кресле' -> 5. Врач в кабинете сразу видит активный визит.",
	faq: [
		{
			question: "Обязательно ли выбирать ассистента при создании записи?",
			answer: "Нет. По Мандату 8e выбор ассистента опционален, чтобы не создавать палки в колёса соло-врачу.",
		},
		{
			question: "Как найти свободное окно у конкретного доктора?",
			answer: "Используйте фильтр врачей в верхней панели или задайте вопрос ИИ-ассистенту ДЕНТА.",
		},
	],
	troubleshooting: [
		{
			symptom: "Сетка расписания не прокручивается или перекрыта",
			cause: "Активно модальное окно или потеряна связь с сервером.",
			solution: "Нажмите Esc для закрытия оверлея или проверьте индикатор сети в правом верхнем углу.",
			recoverySelector: '[data-testid="btn-retry-schedule-connection"]',
		},
	],
	scaleAdaptability:
		"Для соло-кабинета отображается ровно 1 установка без лишних филиалов. Для сети клиник доступно быстрое переключение между филиалами и кабинетами.",
	complianceNotes: "Полная интеграция с табелем смен и рабочим временем врачей.",
	keywords: ["расписание", "календарь", "запись", "приём", "слот", "кресло", "врач", "график", "визит"],
};

export const ODONTOGRAM_ARCH_COMPONENT: CrmComponentKnowledge = {
	id: "odontogram_arch",
	name: "Зубная формула и одонтограмма",
	shortName: "Зубная формула",
	category: "clinical",
	categoryRu: "Клинический приём",
	description:
		"Интерактивная анатомическая карта зубных рядов (FDI 11–48 для взрослых, 51–85 для детей). 1-кликовое присвоение клинических статусов и автосинхронизация со сметой.",
	route: "odontogram",
	primaryRole: ["doctor", "all"],
	tier: 1,
	primaryActions: [
		{
			id: "switch-pediatric-dentition-btn",
			label: "Детский/Взрослый прикус",
			selector: '[data-testid="switch-pediatric-dentition-btn"], [data-testid="switch-adult-dentition-btn"]',
			effect: "Мгновенное переключение между постоянным, молочным и сменным прикусом.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "mark-intact-dentition-btn",
			label: "Норма (Интактно)",
			selector: '[data-testid="mark-intact-dentition-btn"]',
			effect: "Устанавливает физиологическую норму для всех интактных зубов в 1 клик.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "quick-caries-btn",
			label: "Кариес / Пломба / Коронка",
			selector: '[data-testid^="quick-caries-"], [data-testid^="quick-filled-"], [data-testid^="quick-crown-"]',
			effect: "Быстрый штамп патологии или конструкции на выбранный зуб с расчетом цены в смете.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		archGrid: '[data-testid="quadrant-focused-view"]',
		quadrantBar: '[data-testid="odontogram-quadrant-bar"]',
		compactBillBadge: '[data-testid="odontogram-compact-bill-badge"]',
		fastCheckoutRibbon: '[data-testid="odontogram-fast-checkout-ribbon"]',
	},
	visualGuides: [
		{
			element: "Анатомическая зубная дуга",
			selector: '[data-testid="quadrant-focused-view"]',
			description: "Векторные зубы с поверхностями (MODPV), корнями и анатомическими каналами.",
			highlightType: "outline",
		},
		{
			element: "Лента быстрого расчета",
			selector: '[data-testid="odontogram-compact-bill-badge"]',
			description: "Текущая сумма приёма в рублях без вызова модального окна кассы.",
			badgeText: "0-клик",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Врач осматривает полость рта -> 2. Кликает 'Норма' для здоровых зубов -> 3. Кликает больной зуб (например, 16) -> 4. Ставит 'Кариес О' -> 5. Услуга лечения кариеса автоматически летит в предварительную смету.",
	faq: [
		{
			question: "Как отметить отсутствующий зуб мудрости?",
			answer: "В панели квадрантов нажмите кнопку 'Отсутствуют 8-ки' — они мгновенно пометятся как ретенированные/удаленные.",
		},
		{
			question: "Сохраняются ли изменения, если случайно закрыть вкладку?",
			answer: "Да, действует debounced autosave в IndexedDB при каждом клике по зубу.",
		},
	],
	troubleshooting: [
		{
			symptom: "Зуб не реагирует на нажатие",
			cause: "Включен режим просмотра или активна модалка поверх карты.",
			solution: "Закройте открытые шторки клавишей Esc или кликните в поле зубной формулы.",
		},
	],
	scaleAdaptability: "Работает одинаково молниеносно у врача-одиночки и на мульти-мониторной установке в сети.",
	complianceNotes: "Соответствует номенклатуре Минздрава РФ и стандарту заполнения Формы 043/у.",
	keywords: ["зубная формула", "одонтограмма", "зуб", "кариес", "пульпит", "пломба", "коронка", "имплант", "FDI"],
};

export const VISIT_DIARY_COMPONENT: CrmComponentKnowledge = {
	id: "visit_diary",
	name: "Дневник приёма и медицинская карта",
	shortName: "Дневник приёма",
	category: "clinical",
	categoryRu: "Клинический приём",
	description:
		"Электронная медицинская карта стоматологического пациента (Форма 043/у). Заполнение жалоб, анамнеза, объективного статуса по системе SOAP и протокола лечения.",
	route: "visit",
	primaryRole: ["doctor"],
	tier: 1,
	primaryActions: [
		{
			id: "btn-fill-norm",
			label: "✓ Заполнить нормой",
			selector: '[data-testid="btn-fill-norm"], [data-tour="visit-fill-norm"]',
			effect: "В 1 клик заполняет жалобы, анамнез и объективный статус физиологической нормой.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-finish-visit",
			label: "Завершить приём и чек",
			selector: '[data-testid="btn-finish-visit"]',
			effect: "Завершает приём, сохраняет медицинскую запись и открывает расчёт без лишних блокировок.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-print-043u",
			label: "Печать медкарты",
			selector: '[data-testid="btn-print-visit-record"]',
			effect: "Печатает протокол приёма в регламентном типографическом виде с штампом врача.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		complaintsInput: '[data-testid="visit-complaints-input"]',
		anamnesisInput: '[data-testid="visit-anamnesis-input"]',
		objectiveInput: '[data-testid="visit-objective-input"]',
		treatmentInput: '[data-testid="visit-treatment-input"]',
		somaticStatusBadge: '[data-testid="somatic-status-badge"]',
	},
	visualGuides: [
		{
			element: "Кнопка 'Заполнить нормой'",
			selector: '[data-testid="btn-fill-norm"]',
			description: "Экономиет 5 минут на каждом пациенте: здоровые параметры проставляются мгновенно.",
			badgeText: "Норма в 1 клик",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Вход в визит -> 2. Нажатие 'Заполнить нормой' -> 3. Внесение особенностей патологии в поле лечения -> 4. Нажатие 'Завершить приём' -> 5. Автоматическое формирование счёта.",
	faq: [
		{
			question: "Блокируется ли завершение приёма, если не указана температура или пульс?",
			answer: "Ни в коем случае! По Мандату 8e софт никогда не ставит палки в колёса врачу из-за второстепенных полей.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не печатается протокол приёма",
			cause: "В браузере заблокированы всплывающие окна для печати.",
			solution: "Разрешите всплывающие окна в адресной строке для домена CRM.",
		},
	],
	scaleAdaptability: "Врач на аренде заполняет карту за 30 секунд. Сеть клиник получает единообразный аудит качества.",
	complianceNotes: "Форма 043/у Минздрава РФ, Приказ 804н, регламент ведения медицинской документации.",
	keywords: ["дневник", "медкарта", "043у", "приём", "SOAP", "жалобы", "анамнез", "осмотр", "протокол"],
};

export const TREATMENT_PLAN_BUILDER_COMPONENT: CrmComponentKnowledge = {
	id: "treatment_plan_builder",
	name: "Конструктор планов лечения",
	shortName: "Планы лечения",
	category: "clinical",
	categoryRu: "Клинический приём",
	description:
		"Формирование и наглядная презентация комплексных планов лечения в 3 тарифах: Оптимальный, Эконом и Премиум с расчётом рассрочки 0% и этапов.",
	route: "treatment-plans",
	primaryRole: ["doctor", "admin", "owner"],
	tier: 2,
	primaryActions: [
		{
			id: "btn-generate-3-tiers",
			label: "Создать 3 тарифа",
			selector: '[data-testid="btn-generate-plan-tiers"]',
			effect: "Автоматически раскладывает план лечения на Оптимальный, Эконом и Премиальный варианты.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-approve-plan",
			label: "Утвердить план с пациентом",
			selector: '[data-testid="btn-approve-treatment-plan"]',
			effect: "Фиксирует согласованный вариант и отправляет этапы в расписание приёмов.",
			requiresConfirmation: false,
			role: ["doctor", "admin"],
		},
		{
			id: "btn-print-plan-presentation",
			label: "Печать плана пациенту",
			selector: '[data-testid="btn-print-plan-presentation"]',
			effect: "Генерирует эстетичную презентацию для пациента без пугающих микро-расходников (салфеток/валиков).",
			requiresConfirmation: false,
			role: ["doctor", "admin"],
		},
	],
	selectors: {
		tiersSegmentedControl: '[data-testid="plan-tiers-segmented-control"]',
		stagesTimeline: '[data-testid="plan-stages-timeline"]',
		totalSavingsBadge: '[data-testid="plan-savings-badge"]',
	},
	visualGuides: [
		{
			element: "Переключатель тарифов",
			selector: '[data-testid="plan-tiers-segmented-control"]',
			description: "Элегантный Segmented Control в стиле macOS/iOS без длинных вертикальных простыней.",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Составление этапов -> 2. Выбор '3 тарифа' -> 3. Показ на экране планшета/ноутбука пациенту -> 4. Подписание согласия -> 5. Переход к оплате этапа.",
	faq: [
		{
			question: "Блокируется ли план лечения через 30 дней после создания?",
			answer: "Нет. По Мандату 8e истечение срока не блокирует лечение или оплату — врач решает сам.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не переключается выбранный тариф",
			cause: "Идёт фоновый пересчёт стоимости этапов.",
			solution: "Подождите завершения пересчёта (обычно менее 100 мс).",
		},
	],
	scaleAdaptability: "Идеально подходит для демонстрации пациенту у кресла и для согласования куратором лечения.",
	complianceNotes: "Соответствует правилам информирования пациентов и прозрачного расчёта сметы.",
	keywords: ["план лечения", "смета", "тарифы", "эконом", "премиум", "оптимум", "этапы", "рассрочка"],
};

export const PERIO_CHARTING_MAP_COMPONENT: CrmComponentKnowledge = {
	id: "perio_charting_map",
	name: "Пародонтологическая карта (Перио-карта)",
	shortName: "Перио-карта",
	category: "clinical",
	categoryRu: "Клинический приём",
	description:
		"Специализированная карта состояния пародонта: глубина зубодесневых карманов (6 точек на зуб), кровоточивость (BOP), подвижность и фуркации.",
	route: "perio",
	primaryRole: ["doctor"],
	tier: 3,
	primaryActions: [
		{
			id: "btn-perio-autonorm",
			label: "Пародонт в норме (1–2 мм)",
			selector: '[data-testid="btn-perio-autonorm"]',
			effect: "В 1 клик проставляет физиологическую норму десны без необходимости тыкать 192 замера.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		perioGrid: '[data-testid="perio-charting-grid"]',
		bopIndexBadge: '[data-testid="perio-bop-index-badge"]',
	},
	visualGuides: [
		{
			element: "Сетка замеров десны",
			selector: '[data-testid="perio-charting-grid"]',
			description: "Анатомическое отображение рецессий и карманов.",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Вызов перио-карты -> 2. Быстрая авто-норма -> 3. Точечный ввод патологических карманов (например, 5 мм у 46 зуба).",
	faq: [
		{
			question: "Обязательно ли заполнять перио-карту на обычном терапевтическом приёме?",
			answer: "Нет. По Мандату 8zb периодонтограмма вынесена в Tier 3 и вызывается строго пародонтологом по необходимости.",
		},
	],
	troubleshooting: [
		{
			symptom: "Неверный расчет индекса кровоточивости",
			cause: "Не были отмечены интактные зубы.",
			solution: "Нажмите 'Пародонт в норме' для автокалибровки базового индекса.",
		},
	],
	scaleAdaptability: "Для терапевта скрыта, для специализированного пародонтологического кабинета открывается по 1 клику.",
	complianceNotes: "Клинические рекомендации Стоматологической ассоциации России (СтАР) по пародонтиту.",
	keywords: ["пародонтология", "перио-карта", "карманы", "десна", "кровоточивость", "bop", "рецессия"],
};

export const CLINICAL_COMPONENTS: readonly CrmComponentKnowledge[] = [
	SCHEDULE_GRID_COMPONENT,
	ODONTOGRAM_ARCH_COMPONENT,
	VISIT_DIARY_COMPONENT,
	TREATMENT_PLAN_BUILDER_COMPONENT,
	PERIO_CHARTING_MAP_COMPONENT,
];
