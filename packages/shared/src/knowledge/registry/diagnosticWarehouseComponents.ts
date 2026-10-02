import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Diagnostic, Laboratory, Warehouse & SanPiN Modules
 * Mandates: 8e (Doctor Autonomy), 8b (Anti-Monolith <800 lines), 8v (No Nurse Bloat), 8ab (Soft Negative Overdraft)
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
	navigationHint: "F7 или роут imaging (вкладка #imaging)",
	primaryRole: ["doctor"],
	tier: 3,
	hotkeys: {
		"F7": "Молниеносный захват снимка с датчика визиографа / КТ (<50 мс)",
		"M": "Линейка калибровки кости (имплантация)",
		"Колесо мыши": "Прокрутка срезов томограммы MPR",
		"Esc": "Закрыть просмотрщик снимков",
	},
	quickTips: [
		"Мандат 8e: снимок открывается молниеносно без обязательного ожидания нейросети",
		"WebGL2 аппаратный рендеринг GPU предотвращает зависание страницы даже на КТ 500 МБ",
		"Фон slate-950 (WCAG AAA) защищает зрение врача при оценке костных структур",
	],
	primaryActions: [
		{
			id: "btn-capture-rvg",
			label: "Захват с датчика",
			selector: '[data-tour="visiograph-open"], [data-tour="imaging-nav"], [data-testid="btn-capture-rvg-sensor"]',
			hotkey: "F7",
			effect: "Ожидает входящий снимок с визиографа клиники через Hot Folder без зависания интерфейса (<50мс).",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-mpr-axial-toggle",
			label: "Аксиальный срез",
			selector: '[data-tour="mpr-presets"], [data-testid="btn-mpr-axial"]',
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
			id: "btn-caliper-measure",
			label: "Калиброванная линейка (замер гребня)",
			selector: '[data-tour="dicom-ruler"], [data-tour="imaging-measure"], #dicom-ruler-btn, [data-testid="dicom-caliper-tool"]',
			hotkey: "M",
			effect: "Измерение высоты и ширины альвеолярного гребня в миллиметрах перед имплантацией с точностью до десятой доли мм.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		visiographTrigger: '[data-tour="visiograph-open"], [data-tour="imaging-nav"], [data-testid="btn-capture-rvg-sensor"]',
		mprPresets: '[data-tour="mpr-presets"], #dicom-mpr-toolbar',
		caliperTool: '[data-tour="dicom-ruler"], [data-tour="imaging-measure"], #dicom-ruler-btn, [data-testid="dicom-caliper-tool"]',
		viewport3d: '[data-testid="cbct-viewport-3d"]',
		mprSliceContainer: '[data-testid="mpr-slices-grid"]',
		contrastSlider: '[data-testid="dicom-contrast-slider"]',
	},
	visualGuides: [
		{
			element: "Мультипланарная сетка MPR",
			selector: '[data-testid="mpr-slices-grid"]',
			description: "3 взаимно перпендикулярных среза: аксиальный, сагиттальный, корональный.",
			highlightType: "outline",
		},
		{
			element: "Линейка замера кости",
			selector: '[data-tour="dicom-ruler"], [data-testid="dicom-caliper-tool"]',
			description: "Высокоточное измерение костного объема перед установкой имплантатов.",
			badgeText: "M",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Загрузка КТ или захват RVG (F7) -> 2. Быстрый рендеринг <50мс на GPU -> 3. Замер кости калипером для имплантации (M) -> 4. Привязка снимка к карточке зуба.",
	faq: [
		{
			question: "Где смотреть снимок КТ или рентген пациента?",
			answer: "Нажмите клавишу F7 или перейдите во вкладку 'Снимки' (селектор [data-tour='imaging-nav']). Все 3D томограммы, панорамные снимки и визиография прикреплены к карточке пациента.",
		},
		{
			question: "Зависает ли интерфейс при открытии КТ 500 МБ?",
			answer: "Нет. По Мандату 8zc рендеринг выполняется аппаратно на GPU через шейдеры WebGL2 без блокировки UI потока.",
		},
		{
			question: "Как измерить расстояние до нижнечелюстного канала?",
			answer: "Нажмите клавишу M для выбора линейки и проведите отрезок от гребня до кортикальной пластинки канала.",
		},
	],
	troubleshooting: [
		{
			symptom: "Где смотреть снимок КТ или рентген визиографа?",
			cause: "Поиск галереи снимков или томограммы пациента.",
			solution: "Нажмите клавишу F7 или откройте раздел 'Снимки' (#imaging, селектор [data-tour='imaging-nav']). В окне исследования доступны срезы MPR, панорамная кривая и 3D-реконструкция без ожидания нейросети.",
			recoverySelector: '[data-tour="imaging-nav"], [data-tour="visiograph-open"], a[href="#imaging"]',
		},
		{
			symptom: "Черный экран вместо 3D-черепа",
			cause: "В браузере отключено аппаратное ускорение WebGL.",
			solution: "Включите аппаратное ускорение в настройках браузера (chrome://settings/system).",
			recoverySelector: '[data-tour="mpr-presets"], [data-testid="cbct-viewport-3d"]',
		},
		{
			symptom: "Визиограф клиники не передает снимок в CRM",
			cause: "Hot Folder клиники не синхронизирован со сторонней программой датчика.",
			solution: "Нажмите 'Захват с датчика' (F7) или перетащите снимок DICOM/TIFF напрямую в дропзону [data-tour='visiograph-open'].",
			recoverySelector: '[data-tour="visiograph-open"]',
		},
		{
			symptom: "Линейка замера показывает неверный масштаб",
			cause: "Отсутствует шаг калибровки пикселей сенсора в метаданных файла.",
			solution: "Нажмите калибровку линейки 'M' по известному ориентиру (например, паспортной длине имплантата).",
			recoverySelector: '[data-tour="dicom-ruler"]',
		},
	],
	scaleAdaptability: "Для маленького кабинета — простой просмотр снимков визиографа. Для центра — полный MPR анализ.",
	complianceNotes: "DICOM Part 10, поддержка 16-битных серых шкал и калибровки миллиметровых линеек.",
	keywords: [
		"кт",
		"снимки",
		"диком",
		"dicom",
		"рентген",
		"визиограф",
		"оптг",
		"mpr",
		"томография",
		"где смотреть снимок кт",
		"снимок",
		"кость",
		"F7",
		"M",
	],
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
	navigationHint: "Роут warehouse (вкладка #warehouse)",
	primaryRole: ["nurse", "admin", "owner"],
	tier: 2,
	hotkeys: {
		"Esc": "Закрыть окно оприходования или списания",
	},
	quickTips: [
		"Мандат 8e / 8ab: система тихо списывает материалы в отрицательный овердрафт без алертов и прерываний врача",
		"Списание карпул анестетиков выполняется в 1 клик без комиссий из 3 человек",
		"Партии с истекающим сроком подсвечиваются автоматически по правилу FEFO",
	],
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
		carpulesButton: '[data-testid="nurse-quick-carpules-btn"]',
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
			answer: "Никогда! Действует принцип мягкого овердрафта (Мандат 8e / 8ab): спасение зуба важнее задержки бумажки.",
		},
		{
			question: "Как списываются карпулы Ультракаина?",
			answer: "Нажмите 'Списать анестетики' в 1 клик, либо они спишутся автоматически по протоколу услуги визита.",
		},
	],
	troubleshooting: [
		{
			symptom: "Остаток ушёл в минус (красный бейдж овердрафта)",
			cause: "Материал фактически израсходован раньше проведения приходной накладной.",
			solution: "Мандат 8ab: отрицательный овердрафт разрешён; проведите приходную накладную, баланс партии выровняется автоматически.",
			recoverySelector: '[data-testid="btn-acceptance-waybills"]',
		},
		{
			symptom: "Операция или приём заблокированы из-за отсутствия материала на складе?",
			cause: "Ошибочное предположение блокировки.",
			solution: "Мандат 8ab: софт НИКОГДА не блокирует приём из-за склада; списание происходит тихо в фоновом режиме.",
			recoverySelector: '[data-testid="nurse-quick-carpules-btn"]',
		},
	],
	scaleAdaptability: "Для соло-врача склад максимально тих и ненавязчив. Для сети — глубокий партионный учёт.",
	complianceNotes: "СанПиН 3.3686-21, правила хранения медикаментов и дезинфицирующих средств.",
	keywords: ["склад", "материалы", "fefo", "срок годности", "анестетики", "карпулы", "накладная", "овердрафт", "партия"],
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
	navigationHint: "Роут lab (вкладка #lab)",
	primaryRole: ["doctor", "admin"],
	tier: 2,
	hotkeys: {
		"Esc": "Закрыть окно наряда ЗТЛ",
	},
	quickTips: [
		"Мандат 8e: истечение 30 дней не блокирует создание нарядов ЗТЛ",
		"В карточке наряда доступна анатомическая карта расцветки VITA по трем зонам зуба",
	],
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
		createOrderButton: '[data-testid="btn-create-lab-order"]',
		overdueFilterButton: '[data-testid="btn-filter-lab-overdue"]',
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
		{
			question: "Можно ли создать наряд ЗТЛ, если план лечения составлен больше 30 дней назад?",
			answer: "Да. По Мандату 8e истечение 30 дней не блокирует работу ортопеда и создание нарядов.",
		},
	],
	troubleshooting: [
		{
			symptom: "Работа задерживается в лаборатории",
			cause: "Техник запросил уточнение параметров культи.",
			solution: "Проверьте комментарии в карточке наряда и скорректируйте дату визита пациента.",
			recoverySelector: '[data-testid="btn-filter-lab-overdue"]',
		},
		{
			symptom: "Нужно скорректировать дату примерки под визит пациента",
			cause: "Изменилось расписание пациента.",
			solution: "Откройте наряд и измените дату этапа примерки — график автоматически синхронизируется с расписанием врача.",
			recoverySelector: '[data-testid="lab-orders-grid"]',
		},
	],
	scaleAdaptability: "Врач-ортопед напрямую работает с внешним техником, либо сеть клиник загружает собственную лабораторию.",
	complianceNotes: "Форма заказ-наряда ЗТЛ-1, сертификаты соответствия медицинских сплавов и циркония.",
	keywords: ["лаборатория", "зтл", "коронки", "техник", "слепок", "винил", "мост", "vita", "наряд", "примерка"],
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
	navigationHint: "Роут sanpin (вкладка #sanpin)",
	primaryRole: ["nurse", "doctor", "admin"],
	tier: 2,
	hotkeys: {
		"Esc": "Закрыть журнал СанПиН",
	},
	quickTips: [
		"Мандат 8v: запрещен крафт-пакетный маразм у кресла; лоток стерилен по умолчанию",
		"Журнал формы 257/у формируется автоматически в 1 клик для проверок Роспотребнадзора",
		"Никаких обязательных сканирований штрихкодов пакетов на приёме у врача",
	],
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
		autonormButton: '[data-testid="btn-sanpin-autonorm"]',
		exportPdfButton: '[data-testid="btn-export-sanpin-pdf"]',
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
		{
			question: "Какие формы журналов экспортируются?",
			answer: "Форма 257/у (журнал работы автоклава) и форма 366/у (журнал учета азопирамовых проб ПСО).",
		},
	],
	troubleshooting: [
		{
			symptom: "Не сформировался журнал за прошлый месяц",
			cause: "Не были привязаны даты автоклавирования к смене.",
			solution: "Нажмите 'Авто-норма' за выбранный период — журнал заполнится нормативными циклами.",
			recoverySelector: '[data-testid="btn-sanpin-autonorm"]',
		},
		{
			symptom: "Требуется ли врачу сканировать штрихкоды крафт-пакетов перед лечением?",
			cause: "Ошибочная попытка навязать лишнюю бюрократию врачу у кресла.",
			solution: "Мандат 8v: врач лечит пациентов, лоток стерилен по умолчанию, журналы ведутся фоново через Авто-норму СанПиН.",
			recoverySelector: '[data-testid="btn-sanpin-autonorm"]',
		},
	],
	scaleAdaptability: "Для кабинета — тихий фоновый режим. Для сети — централизованный СанПиН комплаенс.",
	complianceNotes: "СанПиН 3.3686-21, журнал формы 257/у, контроль предстерилизационной очистки (ПСО).",
	keywords: ["санпин", "стерилизация", "автоклав", "азопирам", "псо", "роспотребнадзор", "журнал", "крафт-пакет", "257у"],
};

export const DIAGNOSTIC_WAREHOUSE_COMPONENTS: readonly CrmComponentKnowledge[] = [
	CBCT_MPR_STUDIO_COMPONENT,
	WAREHOUSE_FEFO_COMPONENT,
	DENTAL_LAB_ORDERS_COMPONENT,
	SANPIN_STERILIZATION_JOURNAL_COMPONENT,
];
