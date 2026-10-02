import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Clinical CRM Modules — Schedule, Odontogram, Visit Diary, Treatment Plans, Perio Charting
 * Mandates: 8e (Doctor Autonomy), 8b (Anti-Monolith <800 lines), 8n (Solo Doctor Sovereignty), 8x (Plain Russian)
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
	navigationHint: "Alt+1 или роут schedule",
	primaryRole: ["admin", "doctor", "owner", "all"],
	tier: 1,
	hotkeys: {
		"Ctrl+N": "Открыть окно быстрой записи пациента (+ Запись)",
		"Space / Enter": "Быстро начать или завершить приём на выбранном слоте",
		"F5": "Обновить сетку расписания без перезагрузки страницы",
		"Alt+1": "Перейти в раздел Расписание",
		"Esc": "Закрыть модальное окно записи или шторку визита",
	},
	quickTips: [
		"Клик в любую пустую ячейку сетки сразу открывает запись на это время",
		"По Мандату 8e выбор ассистента опционален — не задерживает запись соло-врача",
		"Клавиши Space/Enter переводят визит в 'В кресле' без кликов мышью",
	],
	primaryActions: [
		{
			id: "btn-create-appointment",
			label: "+ Запись",
			selector: '[data-tour="schedule-booking"], #topbar-booking-action-btn, [data-testid="btn-create-appointment"], [data-tour="schedule-slot"]',
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
			selector: '[data-testid^="quick-status-btn-"], [data-tour="schedule-slot"]',
			hotkey: "Space / Enter",
			effect: "Быстрый перевод статуса: 'Ожидает приёма' -> 'В кресле' -> 'Завершён' -> 'Не явился' в 1 клик.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
		{
			id: "btn-refresh-schedule",
			label: "Обновить сетку",
			selector: '[data-testid="btn-refresh-schedule"]',
			hotkey: "F5",
			effect: "Синхронизирует расписание с сервером без потери черновиков и сброса фильтров.",
			requiresConfirmation: false,
			role: ["all"],
		},
	],
	selectors: {
		bookingButton: '[data-tour="schedule-booking"], #topbar-booking-action-btn, [data-testid="btn-create-appointment"]',
		scheduleSlot: '[data-tour="schedule-slot"], [data-testid^="appointment-slot-"]',
		gridContainer: '[data-testid="schedule-grid-container"]',
		chairColumns: '[data-testid^="schedule-chair-column-"]',
		appointmentSlot: '[data-testid^="appointment-slot-"]',
		controlCenter: '[data-testid="clinic-control-center-wrapper"]',
		doctorFilter: '[data-testid="schedule-doctor-filter"]',
		datePicker: '[data-testid="schedule-date-picker"]',
	},
	visualGuides: [
		{
			element: "Кнопка создания записи",
			selector: '[data-tour="schedule-booking"], #topbar-booking-action-btn, [data-testid="btn-create-appointment"]',
			description: "Главная акцентная кнопка (Primary CTA) тулбара для оформления пациента.",
			badgeText: "1-клик",
			highlightType: "pulse",
		},
		{
			element: "Слоты расписания",
			selector: '[data-tour="schedule-slot"], [data-testid^="appointment-slot-"]',
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
		{
			question: "Как быстро перенести запись на другой день или время?",
			answer: "Перетащите карточку приёма мышью (drag-and-drop) в нужный временной интервал или кресло.",
		},
	],
	troubleshooting: [
		{
			symptom: "Сетка расписания не прокручивается или перекрыта",
			cause: "Активно модальное окно или потеряна связь с сервером.",
			solution: "Нажмите Esc для закрытия оверлея или проверьте индикатор сети в правом верхнем углу.",
			recoverySelector: '[data-testid="btn-retry-schedule-connection"], [data-testid="btn-schedule-today"]',
		},
		{
			symptom: "Пациент не отображается в сетке после записи",
			cause: "Выбран другой филиал, кабинет или включен персональный фильтр по другому доктору.",
			solution: "Нажмите 'Сегодня' или сбросьте фильтр врачей в тулбаре.",
			recoverySelector: '[data-testid="btn-schedule-today"]',
		},
		{
			symptom: "Нужно изменить длительность визита с 30 минут на 60 минут",
			cause: "По умолчанию слот бронируется на 30 минут.",
			solution: "Потяните нижний край карточки слота вниз или выберите сегмент длительности в окне записи.",
			recoverySelector: '[data-tour="schedule-slot"]',
		},
	],
	scaleAdaptability:
		"Для соло-кабинета отображается ровно 1 установка без лишних филиалов. Для сети клиник доступно быстрое переключение между филиалами и кабинетами.",
	complianceNotes: "Полная интеграция с табелем смен и рабочим временем врачей.",
	keywords: ["расписание", "календарь", "запись", "приём", "слот", "кресло", "врач", "график", "визит", "бронь", "F5", "Ctrl+N"],
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
	navigationHint: "Alt+2 (вкладка Приём) -> секция Одонтограмма",
	primaryRole: ["doctor", "all"],
	tier: 1,
	hotkeys: {
		"Shift+N": "Физиологическая норма в 1 клик (вся формула интактна)",
		"1..4": "Быстрый выбор взрослого квадранта (11..48)",
		"5..8": "Быстрый выбор молочного квадранта (51..85)",
		"C": "Отметить кариес (МКБ К02) на выбранном зубе / поверхности",
		"P": "Отметить пульпит / периодонтит (МКБ К04)",
		"K": "Отметить искусственную коронку / мостовидный протез",
		"X": "Отметить отсутствующий / удалённый зуб",
		"F9": "Быстрый переход к расчёту и кассе",
	},
	quickTips: [
		"Shift+N заполняет нормой все здоровые зубы за 0 секунд",
		"При выборе зуба и нажатии C, P, K услуга автоматически летит в предварительную смету",
		"Для детей нажмите клавиши 5..8 для переключения в молочный прикус",
	],
	primaryActions: [
		{
			id: "mark-intact-dentition-btn",
			label: "Норма (Интактно)",
			selector: '[data-tour="autonorm-btn"], [data-testid="mark-intact-dentition-btn"]',
			hotkey: "Shift+N",
			effect: "Устанавливает физиологическую норму для всех интактных зубов в 1 клик без ручного прокликивания 32 зубов.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "select-tooth-card",
			label: "Выбор зуба в дуге FDI",
			selector: '[data-tour="tooth-card"], [data-testid^="tooth-item-"], [data-testid^="tooth-card-"]',
			hotkey: "1..8",
			effect: "Выбирает зуб или квадрант для детального осмотра поверхностей (MODPV), корней и каналов.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "quick-caries-btn",
			label: "Кариес / Пломба / Коронка",
			selector: '[data-testid^="quick-caries-"], [data-testid^="quick-filled-"], [data-testid^="quick-crown-"]',
			hotkey: "C, P, K, X",
			effect: "Быстрый штамп патологии или конструкции на выбранный зуб с расчетом цены в смете.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "switch-pediatric-dentition-btn",
			label: "Детский/Взрослый прикус",
			selector: '[data-testid="switch-pediatric-dentition-btn"], [data-testid="switch-adult-dentition-btn"]',
			hotkey: "5..8",
			effect: "Мгновенное переключение между постоянным (11–48), молочным (51–85) и сменным прикусом.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "odontogram-fast-checkout",
			label: "Быстрый расчет сметы",
			selector: '[data-tour="fast-cashier"], [data-tour="cashier-pay"], [data-testid="odontogram-fast-checkout-ribbon"], [data-testid="odontogram-compact-bill-badge"]',
			hotkey: "F9",
			effect: "Отображает текущую сумму приёма в рублях и открывает чекаут в 1 клик.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		archGrid: '[data-testid="quadrant-focused-view"], [data-tour="odontogram-formula"]',
		toothCard: '[data-tour="tooth-card"], [data-testid^="tooth-item-"]',
		autonormButton: '[data-tour="autonorm-btn"], [data-testid="mark-intact-dentition-btn"]',
		quadrantBar: '[data-testid="odontogram-quadrant-bar"]',
		compactBillBadge: '[data-testid="odontogram-compact-bill-badge"]',
		fastCheckoutRibbon: '[data-testid="odontogram-fast-checkout-ribbon"], [data-tour="fast-cashier"]',
	},
	visualGuides: [
		{
			element: "Анатомическая зубная дуга",
			selector: '[data-testid="quadrant-focused-view"], [data-tour="odontogram-formula"]',
			description: "Векторные зубы с поверхностями (MODPV), корнями и анатомическими каналами.",
			highlightType: "outline",
		},
		{
			element: "Кнопка Автонормы Shift+N",
			selector: '[data-tour="autonorm-btn"], [data-testid="mark-intact-dentition-btn"]',
			description: "Экономит 90% времени осмотра: здоровая физиологическая норма ставится мгновенно.",
			badgeText: "Shift+N",
			highlightType: "pulse",
		},
		{
			element: "Лента быстрого расчета",
			selector: '[data-testid="odontogram-compact-bill-badge"], [data-tour="fast-cashier"]',
			description: "Текущая сумма приёма в рублях без вызова модального окна кассы.",
			badgeText: "0-клик",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Врач осматривает полость рта -> 2. Нажимает Shift+N ('Норма') для здоровых зубов -> 3. Кликает больной зуб (например, 16) -> 4. Нажимает 'C' (Кариес О) -> 5. Услуга лечения кариеса автоматически летит в предварительную смету -> 6. Нажимает F9 для чекаута.",
	faq: [
		{
			question: "Как отметить отсутствующий зуб мудрости?",
			answer: "В панели квадрантов нажмите кнопку 'Отсутствуют 8-ки' либо выберите зуб и нажмите клавишу X.",
		},
		{
			question: "Сохраняются ли изменения, если случайно закрыть вкладку?",
			answer: "Да, действует debounced autosave в IndexedDB при каждом клике по зубу.",
		},
		{
			question: "Поддерживается ли молочный прикус у детей?",
			answer: "Да, нажимая клавиши 5..8 или переключатель прикуса, формула переключается на молочные зубы 51–85.",
		},
	],
	troubleshooting: [
		{
			symptom: "Зуб не реагирует на нажатие",
			cause: "Включен режим просмотра или активна модальная шторка поверх карты.",
			solution: "Закройте открытые шторки клавишей Esc или кликните в поле зубной формулы.",
			recoverySelector: '[data-tour="autonorm-btn"], [data-testid="mark-intact-dentition-btn"]',
		},
		{
			symptom: "В смете не появилась сумма после выбора патологии",
			cause: "В номенклатуре клиники услуга привязана к осмотру без фиксированной цены или прайс не выбран.",
			solution: "Кликните ленту расчета сметы [data-testid='odontogram-compact-bill-badge'] или примените клинический протокол.",
			recoverySelector: '[data-testid="odontogram-compact-bill-badge"]',
		},
		{
			symptom: "Ошибочно выставлен диагноз или удаление зуба",
			cause: "Случайное нажатие горячей клавиши не на том зубе.",
			solution: "Выберите зуб и нажмите 'Норма' (Shift+N) для возврата зуба в интактное состояние.",
			recoverySelector: '[data-tour="autonorm-btn"]',
		},
	],
	scaleAdaptability: "Работает одинаково молниеносно у врача-одиночки и на мульти-мониторной установке в сети.",
	complianceNotes: "Соответствует номенклатуре Минздрава РФ и стандарту заполнения Формы 043/у.",
	keywords: ["зубная формула", "одонтограмма", "зуб", "кариес", "пульпит", "пломба", "коронка", "имплант", "FDI", "Shift+N", "F9", "прикус"],
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
	navigationHint: "Alt+2 или роут visit",
	primaryRole: ["doctor"],
	tier: 1,
	hotkeys: {
		"Shift+N": "✓ Заполнить нормой жалобы, анамнез и объективный статус",
		"Ctrl+S": "Сохранить протокол визита в базу данных и локальный черновик",
		"F12 / Ctrl+P": "Быстрая печать протокола приёма со штампом врача",
		"Space / Enter": "Начать или завершить приём у кресла",
		"Ctrl+Enter": "Подтвердить введенные данные в форме визита",
	},
	quickTips: [
		"Кнопка 'Заполнить нормой' проставляет здоровый статус в 1 клик",
		"Мандат 8e: завершение визита НИКОГДА не блокируется из-за аллергий или пропущенных необязательных полей",
		"Автосохранение сохраняет каждую букву каждые 500мс",
	],
	primaryActions: [
		{
			id: "btn-fill-norm",
			label: "✓ Заполнить нормой",
			selector: '[data-tour="autonorm-btn"], [data-tour="visit-fill-norm"], [data-testid="btn-fill-norm"]',
			hotkey: "Shift+N",
			effect: "В 1 клик заполняет жалобы, анамнез и объективный статус физиологической нормой.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-save-draft",
			label: "Сохранить протокол",
			selector: '[data-tour="visit-diary"], #diary-autosave-status, [data-testid="btn-save-visit-draft"]',
			hotkey: "Ctrl+S",
			effect: "Молниеносно сохраняет протокол визита в базу данных и защищает от потери связи.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-finish-visit",
			label: "Завершить приём и чек",
			selector: '[data-testid="btn-finish-visit"]',
			hotkey: "Space / Enter",
			effect: "Завершает приём, сохраняет медицинскую запись и открывает расчёт без лишних блокировок.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-print-043u",
			label: "Печать медкарты",
			selector: '[data-testid="btn-print-visit-record"]',
			hotkey: "F12 / Ctrl+P",
			effect: "Печатает протокол приёма в регламентном типографическом виде со штампом врача.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-clinical-presets",
			label: "Клинические протоколы (SOAP)",
			selector: '[data-tour="diary-preset"], [data-testid^="btn-clinical-preset-"]',
			effect: "Вставляет готовый клинический протокол (терапия, ортопедия, хирургия) за 1 клик.",
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
		diaryAutosaveStatus: '#diary-autosave-status, [data-tour="visit-diary"]',
		fillNormButton: '[data-tour="autonorm-btn"], [data-testid="btn-fill-norm"]',
	},
	visualGuides: [
		{
			element: "Кнопка 'Заполнить нормой'",
			selector: '[data-tour="autonorm-btn"], [data-testid="btn-fill-norm"]',
			description: "Экономит 5 минут на каждом пациенте: здоровые параметры проставляются мгновенно.",
			badgeText: "Норма в 1 клик",
			highlightType: "pulse",
		},
		{
			element: "Клинические пресеты SOAP",
			selector: '[data-tour="diary-preset"]',
			description: "Готовые шаблоны протоколов лечения для терапевтов, хирургов и ортопедов.",
			badgeText: "Шаблоны",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Вход в визит (Alt+2) -> 2. Нажатие 'Заполнить нормой' (Shift+N) -> 3. Внесение особенностей патологии в протокол (Ctrl+S) -> 4. Нажатие 'Завершить приём' (Space/Enter) -> 5. Автоматическое формирование счёта.",
	faq: [
		{
			question: "Блокируется ли завершение приёма, если не указана температура или пульс?",
			answer: "Ни в коем случае! По Мандату 8e софт никогда не ставит палки в колёса врачу из-за второстепенных полей.",
		},
		{
			question: "Как распечатать черновик медкарты до завершения приёма?",
			answer: "Нажмите F12 или кнопку 'Печать медкарты' — протокол выведется со штампом 'ЧЕРНОВИК'.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не печатается протокол приёма",
			cause: "В браузере заблокированы всплывающие окна для печати.",
			solution: "Разрешите всплывающие окна в адресной строке для домена CRM или нажмите Ctrl+P.",
			recoverySelector: '[data-testid="btn-print-visit-record"]',
		},
		{
			symptom: "Кнопка завершения приёма заблокирована из-за аллергии?",
			cause: "Ложное предположение блокировки.",
			solution: "По Мандатам 8e и 8z аллергия отображается как пассивная плашка, кнопка 'Завершить приём' всегда доступна в 1 клик.",
			recoverySelector: '[data-testid="btn-finish-visit"]',
		},
		{
			symptom: "Случайно закрылась вкладка браузера во время набора дневника",
			cause: "Случайное закрытие или сбой питания.",
			solution: "Все поля имеют debounced autosave и сохраняются в локальное хранилище — при повторном открытии текст восстановится автоматически.",
			recoverySelector: '#diary-autosave-status, [data-tour="visit-diary"]',
		},
	],
	scaleAdaptability: "Врач на аренде заполняет карту за 30 секунд. Сеть клиник получает единообразный аудит качества.",
	complianceNotes: "Форма 043/у Минздрава РФ, Приказ 804н, регламент ведения медицинской документации.",
	keywords: ["дневник", "медкарта", "043у", "приём", "SOAP", "жалобы", "анамнез", "осмотр", "протокол", "Shift+N", "Ctrl+S", "F12"],
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
	navigationHint: "Раздел Планы лечения или шторка визита",
	primaryRole: ["doctor", "admin", "owner"],
	tier: 2,
	hotkeys: {
		"Ctrl+P": "Печать презентации плана пациенту",
		"Esc": "Закрыть окно конструктора плана",
	},
	quickTips: [
		"3 тарифа формируются автоматически на основе зубной формулы",
		"Мандат 8e: истечение 30 дней никогда не блокирует план или оплату",
		"Пациенту демонстрируется чистая смета без микро-расходников (валиков и перчаток)",
	],
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
			hotkey: "Ctrl+P",
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
		{
			question: "Как разбить оплату плана на несколько посещений?",
			answer: "Каждый этап плана оформляется отдельным блоком с независимой датой и счётом к оплате.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не переключается выбранный тариф",
			cause: "Идёт фоновый пересчёт стоимости этапов.",
			solution: "Подождите завершения пересчёта (обычно менее 100 мс).",
			recoverySelector: '[data-testid="plan-tiers-segmented-control"]',
		},
		{
			symptom: "Пациент сомневается из-за высокой цены Премиум тарифа",
			cause: "Стоимость комплексного плана превышает текущий бюджет пациента.",
			solution: "Переключите Segmented Control на 'Оптимальный' или 'Эконом' в 1 клик, либо включите опцию 0% рассрочки без переплат.",
			recoverySelector: '[data-testid="plan-tiers-segmented-control"]',
		},
		{
			symptom: "Прошло более 30 дней с момента создания плана",
			cause: "Истёк стандартный 30-дневный срок актуальности цен.",
			solution: "По Мандату 8e истечение 30 дней не блокирует оказание услуг или оплату; врач свободно утверждает план или обновляет тарифы.",
			recoverySelector: '[data-testid="btn-approve-treatment-plan"]',
		},
		{
			symptom: "Как применить скидку по гарантии на этапы плана лечения?",
			cause: "Гарантийная переделка реставрации или конструкции.",
			solution: "В смете плана примените скидку '100% Гарантия' (селектор [data-tour='guarantee-discount']). Врач автономен (Мандат 8e) — согласование начмеда не требуется, стоимость переделки списывается по гарантийному акту.",
			recoverySelector: '[data-tour="guarantee-discount"], [data-testid="plan-tiers-segmented-control"]',
		},
	],
	scaleAdaptability: "Идеально подходит для демонстрации пациенту у кресла и для согласования куратором лечения.",
	complianceNotes: "Соответствует правилам информирования пациентов и прозрачного расчёта сметы.",
	keywords: [
		"план лечения",
		"смета",
		"скидка по гарантии",
		"гарантия",
		"гарантийный",
		"переделка",
		"тарифы",
		"эконом",
		"премиум",
		"оптимум",
		"этапы",
		"рассрочка",
		"Ctrl+P",
	],
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
	navigationHint: "Раздел Периодонтограмма (Tier 3)",
	primaryRole: ["doctor"],
	tier: 3,
	hotkeys: {
		"Shift+N": "Пародонт в норме (авто-норма глубин 1–2 мм)",
		"Esc": "Закрыть пародонтограмму",
	},
	quickTips: [
		"Мандат 8k: используйте 'Пародонт в норме' для авто-заполнения 1–2 мм в 1 клик",
		"Перио-карта относится к Tier 3 и вызывается пародонтологом только при клинической необходимости",
	],
	primaryActions: [
		{
			id: "btn-perio-autonorm",
			label: "Пародонт в норме (1–2 мм)",
			selector: '[data-testid="btn-perio-autonorm"]',
			hotkey: "Shift+N",
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
		"1. Вызов перио-карты -> 2. Быстрая авто-норма (Shift+N) -> 3. Точечный ввод патологических карманов (например, 5 мм у 46 зуба).",
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
			recoverySelector: '[data-testid="btn-perio-autonorm"]',
		},
		{
			symptom: "Ввод 192 точек карманов отнимает слишком много времени врача",
			cause: "Ручной замер каждой точки десны.",
			solution: "Мандат 8k: нажмите 'Пародонт в норме' (Shift+N) для авто-заполнения нормальных значений, затем скорректируйте только патологические участки.",
			recoverySelector: '[data-testid="btn-perio-autonorm"]',
		},
	],
	scaleAdaptability: "Для терапевта скрыта, для специализированного пародонтологического кабинета открывается по 1 клику.",
	complianceNotes: "Клинические рекомендации Стоматологической ассоциации России (СтАР) по пародонтиту.",
	keywords: ["пародонтология", "перио-карта", "карманы", "десна", "кровоточивость", "bop", "рецессия", "Shift+N"],
};

export const CLINICAL_COMPONENTS: readonly CrmComponentKnowledge[] = [
	SCHEDULE_GRID_COMPONENT,
	ODONTOGRAM_ARCH_COMPONENT,
	VISIT_DIARY_COMPONENT,
	TREATMENT_PLAN_BUILDER_COMPONENT,
	PERIO_CHARTING_MAP_COMPONENT,
];
