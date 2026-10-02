import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Diagnostic, Laboratory, Warehouse & SanPiN Modules
 * Mandates: 8e (Doctor Autonomy), 8b (Anti-Monolith <800 lines), 8v (No Nurse Bloat)
 */

export const CBCT_MPR_STUDIO_COMPONENT: CrmComponentKnowledge = {
	id: "cbct_mpr_studio",
	name: "КТ и рентген-диагностика (MPR-студия)",
	shortName: "КТ и снимки",
	category: "diagnostics",
	categoryRu: "Диагностика и снимки",
	description:
		"Аппаратный просмотр радиовизиографических снимков (RVG), панорамных томограмм (ОПТГ) и 3D КЛКТ с мультипланарной реконструкцией (MPR) на WebGL2.",
	route: "imaging",
	primaryRole: ["doctor"],
	tier: 3,
	primaryActions: [
		{
			id: "btn-mpr-axial-toggle",
			label: "Аксиальный срез",
			selector: '[data-testid="btn-mpr-axial"]',
			effect: "Переключает активный фокус на горизонтальный срез челюсти.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-mpr-panoramic-curve",
			label: "Панорамная кривая",
			selector: '[data-testid="btn-mpr-panoramic"]',
			effect: "Строит развернутую панораму зубного ряда по заданной траектории челюстной дуги.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-capture-rvg",
			label: "Захват с датчика",
			selector: '[data-testid="btn-capture-rvg-sensor"]',
			effect: "Ожидает входящий снимок с визиографа клиники через Hot Folder без зависания интерфейса.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		viewport3d: '[data-testid="cbct-viewport-3d"]',
		mprSliceContainer: '[data-testid="mpr-slices-grid"]',
		contrastSlider: '[data-testid="dicom-contrast-slider"]',
		caliperTool: '[data-testid="dicom-caliper-tool"]',
	},
	visualGuides: [
		{
			element: "Мультипланарная сетка MPR",
			selector: '[data-testid="mpr-slices-grid"]',
			description: "3 взаимно перпендикулярных среза: аксиальный, сагиттальный, корональный.",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Загрузка КТ или захват RVG -> 2. Быстрый рендеринг <50мс на GPU -> 3. Замер кости калипером для имплантации -> 4. Привязка снимка к карточке зуба.",
	faq: [
		{
			question: "Зависает ли интерфейс при открытии КТ 500 МБ?",
			answer: "Нет. По Мандату 8zc рендеринг выполняется аппаратно на GPU через шейдеры WebGL2 без блокировки UI потока.",
		},
	],
	troubleshooting: [
		{
			symptom: "Черный экран вместо 3D-черепа",
			cause: "В браузере отключено аппаратное ускорение WebGL.",
			solution: "Включите аппаратное ускорение в настройках браузера (chrome://settings/system).",
		},
	],
	scaleAdaptability: "Для маленького кабинета — простой просмотр снимков визиографа. Для центра — полный MPR анализ.",
	complianceNotes: "DICOM Part 10, поддержка 16-битных серых шкал и калибровки миллиметровых линеек.",
	keywords: ["кт", "снимки", "диком", "dicom", "рентген", "визиограф", "оптг", "mpr", "томография", "кость"],
};

export const WAREHOUSE_FEFO_COMPONENT: CrmComponentKnowledge = {
	id: "warehouse_fefo",
	name: "Склад материалов и партионный учёт FEFO",
	shortName: "Склад",
	category: "warehouse",
	categoryRu: "Склад и материалы",
	description:
		"Учёт стоматологических материалов, партий, сроков годности (First Expired, First Out), списание анестетиков в 1 клик и мягкий овердрафт.",
	route: "warehouse",
	primaryRole: ["nurse", "admin", "owner"],
	tier: 2,
	primaryActions: [
		{
			id: "btn-quick-carpules-deduct",
			label: "Списать анестетики",
			selector: '[data-testid="nurse-quick-carpules-btn"]',
			effect: "В 1 клик списывает отработанные карпулы анестетика без составления комиссий.",
			requiresConfirmation: false,
			role: ["nurse", "doctor", "admin"],
		},
		{
			id: "btn-fefo-filter-warning",
			label: "Скоро истекает срок",
			selector: '[data-testid="fefo-filter-warning"]',
			effect: "Фильтрует партии с истекающим сроком годности (30/60 дней) для первоочередного расхода.",
			requiresConfirmation: false,
			role: ["nurse", "admin"],
		},
		{
			id: "btn-inbound-waybill",
			label: "+ Приходная накладная",
			selector: '[data-testid="btn-acceptance-waybills"]',
			effect: "Оприходование партии материалов от поставщика с указанием серии и срока годности.",
			requiresConfirmation: false,
			role: ["nurse", "admin"],
		},
	],
	selectors: {
		fefoTable: '[data-testid="tab-inventory-fefo"]',
		searchInventoryInput: '[data-testid="inventory-search-input"]',
		overdraftBadge: '[data-testid^="fefo-overdraft-badge-"]',
	},
	visualGuides: [
		{
			element: "Кнопка быстрого списания анестетиков",
			selector: '[data-testid="nurse-quick-carpules-btn"]',
			description: "Мгновенное пакетное списание без бумажной волокиты.",
			badgeText: "1-клик",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Приём завершён -> 2. Материалы списываются автоматически по техкарте услуги -> 3. При задержке накладной включается мягкий овердрафт.",
	faq: [
		{
			question: "Заблокирует ли система операцию, если материал на складе временно числится с нулевым остатком?",
			answer: "Никогда! Действует принцип мягкого овердрафта (Мандат 8e): спасение зуба важнее задержки бумажки.",
		},
	],
	troubleshooting: [
		{
			symptom: "Остаток ушёл в минус (красный бейдж)",
			cause: "Материал фактически израсходован раньше проведения приходной накладной.",
			solution: "Проведите приходную накладную от поставщика — баланс партии автоматически выровняется.",
		},
	],
	scaleAdaptability: "Для соло-врача склад максимально тих и ненавязчив. Для сети — глубокий партионный учёт.",
	complianceNotes: "СанПиН 3.3686-21, правила хранения медикаментов и дезинфицирующих средств.",
	keywords: ["склад", "материалы", "fefo", "срок годности", "анестетики", "карпулы", "накладная", "овердрафт"],
};

export const DENTAL_LAB_ORDERS_COMPONENT: CrmComponentKnowledge = {
	id: "dental_lab_orders",
	name: "Зуботехническая лаборатория (ЗТЛ)",
	shortName: "Лаборатория ЗТЛ",
	category: "laboratory",
	categoryRu: "Зуботехническая лаборатория",
	description:
		"Управление нарядами в зуботехническую лабораторию: ортопедические конструкции (коронки, мосты, виниры, элайнеры), расцветка VITA и сроки сдачи.",
	route: "lab",
	primaryRole: ["doctor", "admin"],
	tier: 2,
	primaryActions: [
		{
			id: "btn-create-lab-order",
			label: "+ Наряд в лабораторию",
			selector: '[data-testid="btn-create-lab-order"]',
			effect: "Создаёт наряд-заказ зуботехнику с указанием зубов, расцветки и даты примерки.",
			requiresConfirmation: false,
			role: ["doctor", "admin"],
		},
		{
			id: "btn-filter-lab-overdue",
			label: "Контроль сроков",
			selector: '[data-testid="btn-filter-lab-overdue"]',
			effect: "Показывает работы, срок сдачи которых приближается к дате визита пациента.",
			requiresConfirmation: false,
			role: ["doctor", "admin"],
		},
	],
	selectors: {
		ordersGrid: '[data-testid="lab-orders-grid"]',
		statusPill: '[data-testid^="lab-order-status-"]',
	},
	visualGuides: [
		{
			element: "Канбан этапов лаборатории",
			selector: '[data-testid="lab-orders-grid"]',
			description: "Отслеживание статусов: 'Отправлен' -> 'В работе' -> 'Примерка' -> 'Сдан'.",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Снятие слепка/скана -> 2. Создание наряда с цветом VITA -> 3. Курьер забирает слепок -> 4. Техник изготавливает -> 5. Фиксация в кресле.",
	faq: [
		{
			question: "Как указать сложную расцветку зуба (например, шейка A3, тело A2, режущий край B1)?",
			answer: "В карточке наряда доступна анатомическая карта расцветки VITA по трем зонам зуба.",
		},
	],
	troubleshooting: [
		{
			symptom: "Работа задерживается в лаборатории",
			cause: "Техник запросил уточнение параметров культи.",
			solution: "Проверьте комментарии в карточке наряда и скорректируйте дату визита пациента.",
		},
	],
	scaleAdaptability: "Врач-ортопед напрямую работает с внешним техником, либо сеть клиник загружает собственную лабораторию.",
	complianceNotes: "Форма заказ-наряда ЗТЛ-1, сертификаты соответствия медицинских сплавов и циркония.",
	keywords: ["лаборатория", "зтл", "коронки", "техник", "слепок", "винил", "мост", "vita", "наряд"],
};

export const SANPIN_STERILIZATION_JOURNAL_COMPONENT: CrmComponentKnowledge = {
	id: "sanpin_sterilization_journal",
	name: "Журнал стерилизации и автоклавирования",
	shortName: "Стерилизация",
	category: "sanpin",
	categoryRu: "Стерилизация и СанПиН",
	description:
		"Электронный журнал СанПиН 3.3686-21: циклы автоклавирования, азопирамовая проба (ПСО), химические индикаторы 5 класса и экспорт для проверок.",
	route: "sanpin",
	primaryRole: ["nurse", "doctor", "admin"],
	tier: 2,
	primaryActions: [
		{
			id: "btn-sanpin-autonorm",
			label: "Авто-норма СанПиН",
			selector: '[data-testid="btn-sanpin-autonorm"]',
			effect: "В 1 клик фиксирует успешное прохождение азопирамовой пробы и стерилизации без фиктивных кликов.",
			requiresConfirmation: false,
			role: ["nurse", "doctor"],
		},
		{
			id: "btn-export-sanpin-pdf",
			label: "Экспорт для Роспотребнадзора",
			selector: '[data-testid="btn-export-sanpin-pdf"]',
			effect: "Генерирует готовые журналы (форма 257/у, 366/у) для надзорных органов.",
			requiresConfirmation: false,
			role: ["nurse", "admin", "owner"],
		},
	],
	selectors: {
		autoclaveLogTable: '[data-testid="sanpin-autoclave-log-table"]',
		azopiramBadge: '[data-testid="sanpin-azopiram-status-badge"]',
	},
	visualGuides: [
		{
			element: "Кнопка Авто-нормы",
			selector: '[data-testid="btn-sanpin-autonorm"]',
			description: "Мандат 8v: стерилизация — это фоновая отчетность, а не рутина у кресла.",
			badgeText: "Авто-норма",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Инструменты в лотке стерильны по умолчанию -> 2. Циклы автоклава логируются автоматически -> 3. При проверке РПН журнал выгружается в 1 клик.",
	faq: [
		{
			question: "Нужно ли врачу сканировать штрихкоды крафт-пакетов перед каждым лечением кариеса?",
			answer: "НЕТ! По Мандату 8v крафт-пакетный маразм у кресла запрещен. Лоток стерилен по умолчанию.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не сформировался журнал за прошлый месяц",
			cause: "Не были привязаны даты автоклавирования к смене.",
			solution: "Нажмите 'Авто-норма' за выбранный период — журнал заполнится нормативными циклами.",
		},
	],
	scaleAdaptability: "Для кабинета — тихий фоновый режим. Для сети — централизованный СанПиН комплаенс.",
	complianceNotes: "СанПиН 3.3686-21, журнал формы 257/у, контроль предстерилизационной очистки (ПСО).",
	keywords: ["санпин", "стерилизация", "автоклав", "азопирам", "псо", "роспотребнадзор", "журнал", "крафт-пакет"],
};

export const DIAGNOSTIC_WAREHOUSE_COMPONENTS: readonly CrmComponentKnowledge[] = [
	CBCT_MPR_STUDIO_COMPONENT,
	WAREHOUSE_FEFO_COMPONENT,
	DENTAL_LAB_ORDERS_COMPONENT,
	SANPIN_STERILIZATION_JOURNAL_COMPONENT,
];
