import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Finance, Cashier, Patient Record, Analytics, Copilot & Document Components
 * Mandates: 8e (Doctor Autonomy / Cashier without INN), 8b (Anti-Monolith <800 lines), 8x (Plain Russian)
 */

export const KKT_CASHIER_COMPONENT: CrmComponentKnowledge = {
	id: "kkt_cashier",
	name: "Касса и чеки 54-ФЗ",
	shortName: "Касса",
	category: "finance",
	categoryRu: "Финансы и касса",
	description:
		"Фискальный кассовый модуль с поддержкой 54-ФЗ (ФФД 1.2), онлайн-касс Атол/Штрих-М по локальной сети (LAN TCP), СБП QR, карт и авансов.",
	route: "billing",
	primaryRole: ["admin", "doctor", "owner"],
	tier: 1,
	primaryActions: [
		{
			id: "btn-cashier-pay-card",
			label: "Оплата картой (POS)",
			selector: '[data-testid="btn-pay-pos-card"]',
			effect: "Пробивает фискальный чек с признаком безналичного расчёта по банковскому терминалу.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
		{
			id: "btn-cashier-pay-cash",
			label: "Наличные (без сдачи)",
			selector: '[data-testid="btn-pay-cash-exact"]',
			effect: "Пробивает чек на точную сумму наличными без необходимости ручного набора копеек.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
		{
			id: "btn-cashier-pay-sbp",
			label: "Оплата по QR СБП",
			selector: '[data-testid="btn-pay-sbp-qr"]',
			effect: "Генерирует динамический QR-код Системы Быстрых Платежей для сканирования пациентом.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
	],
	selectors: {
		totalDueAmount: '[data-testid="cashier-total-due-rub"]',
		splitPaymentPanel: '[data-testid="cashier-split-payment-panel"]',
		kktStatusIndicator: '[data-testid="kkt-lan-status-indicator"]',
		receiptPrintHistory: '[data-testid="cashier-receipts-table"]',
	},
	visualGuides: [
		{
			element: "Кнопки быстрой оплаты",
			selector: '[data-testid="btn-pay-pos-card"]',
			description: "1-кликовая оплата картой или наличными без блокирующих модалок.",
			badgeText: "1-клик",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Завершение приёма -> 2. Выбор способа оплаты (Карта/Нал/СБП/Сплит) -> 3. Чек 54-ФЗ автоматически печатается и фискализируется в ОФД.",
	faq: [
		{
			question: "Требует ли программа ИНН с пациента-физлица?",
			answer: "Нет! По закону 54-ФЗ и Мандату 8e ИНН обязателен только юрлицам. С физлиц он не запрашивается.",
		},
		{
			question: "Что происходит при 100% скидке (гарантийная переделка 0 руб)?",
			answer: "Чек в кассу не пробивается (по ФФД 1.2 нулевой чек запрещён), оформляется внутренний гарантийный акт.",
		},
	],
	troubleshooting: [
		{
			symptom: "Ошибка связи с кассой (LAN timeout)",
			cause: "Кассовый аппарат выключен или сменился IP-адрес в локальной сети.",
			solution: "Чек автоматически ставится в офлайн-очередь с автоповтором и пробьётся при восстановлении связи.",
		},
	],
	scaleAdaptability: "Соло-врач пробивает чек сам за 2 клика. Ресепшен клиники обслуживает сплит-платежи семьи.",
	complianceNotes: "54-ФЗ, ФФД 1.2, теги НДС (освобождено по ст. 149 НК РФ), QR-код чека ФНС.",
	keywords: ["касса", "чек", "54фз", "оплата", "терминал", "наличные", "сбп", "qr", "фискализация", "офд"],
};

export const PATIENT_CARD_RECORD_COMPONENT: CrmComponentKnowledge = {
	id: "patient_card_record",
	name: "Карточка пациента и соматический статус",
	shortName: "Карточка пациента",
	category: "patient_management",
	categoryRu: "Картотека пациентов",
	description:
		"Единый профиль пациента: паспортные данные, контакты, соматический статус, аллергии, семейный баланс, история посещений и галерея снимков.",
	route: "patients",
	primaryRole: ["admin", "doctor", "all"],
	tier: 1,
	primaryActions: [
		{
			id: "btn-create-patient",
			label: "+ Новый пациент",
			selector: '[data-testid="btn-create-patient"]',
			effect: "Создаёт карточку пациента по номеру телефона и ФИО за несколько секунд.",
			requiresConfirmation: false,
			role: ["admin", "doctor", "all"],
		},
		{
			id: "btn-somatic-healthy",
			label: "Соматически здоров / Норма",
			selector: '[data-testid="btn-somatic-healthy-default"]',
			effect: "Устанавливает отсутствие общих соматических отягощений в 1 клик.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
		{
			id: "btn-open-family-balance",
			label: "Семейный счёт",
			selector: '[data-testid="btn-family-balance-drawer"]',
			effect: "Открывает общий семейный кошелёк (родители + дети) для единой оплаты.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
	],
	selectors: {
		patientSearchBar: '[data-testid="patients-search-input"]',
		patientListTable: '[data-testid="patients-list-table"]',
		patientAllergyBanner: '[data-testid="patient-allergy-alert-banner"]',
		patientFamilyWallet: '[data-testid="patient-family-wallet-badge"]',
	},
	visualGuides: [
		{
			element: "Поиск пациентов",
			selector: '[data-testid="patients-search-input"]',
			description: "Мгновенный поиск по номеру телефона, фамилии или номеру карты.",
			highlightType: "outline",
		},
		{
			element: "Аллергический бейдж",
			selector: '[data-testid="patient-allergy-alert-banner"]',
			description: "Пассивное предупреждение о противопоказаниях без навязчивых блокировок.",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Звонок или приход -> 2. Быстрый поиск в шапке (Ctrl+K) -> 3. Открытие карты -> 4. Проверка аллергий -> 5. Запись или приём.",
	faq: [
		{
			question: "Нужно ли заполнять 50 вопросов соматической анкеты стационара?",
			answer: "Нет. По Мандату 8i стоматологический соматический статус фокусируется строго на аллергиях и гемостазе.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не находит пациента по номеру телефона",
			cause: "Номер введён с пробелами или нестандартным кодом страны.",
			solution: "Система автоматически нормализует номера в формат +7 (9XX) XXX-XX-XX.",
		},
	],
	scaleAdaptability: "Для соло-врача — быстрый список своих пациентов. Для сети — централизованная база с защитой ПДн.",
	complianceNotes: "Федеральный закон 152-ФЗ 'О персональных данных', медицинская тайна ст. 13 323-ФЗ.",
	keywords: ["пациент", "карточка", "поиск", "телефон", "аллергия", "баланс", "семья", "соматика"],
};

export const ANALYTICS_DASHBOARD_COMPONENT: CrmComponentKnowledge = {
	id: "analytics_dashboard",
	name: "Аналитика клиники и отчёты",
	shortName: "Аналитика",
	category: "analytics",
	categoryRu: "Аналитика и отчёты",
	description:
		"Управленческий дашборд владельца и главврача: выручка клиники, средний чек, загрузка кресел, первичные пациенты, зарплатная ведомость Т-51.",
	route: "analytics",
	primaryRole: ["owner", "admin"],
	tier: 3,
	primaryActions: [
		{
			id: "btn-filter-period-month",
			label: "За текущий месяц",
			selector: '[data-testid="analytics-period-month"]',
			effect: "Пересчитывает все финансовые и клинические метрики за последние 30 дней.",
			requiresConfirmation: false,
			role: ["owner", "admin"],
		},
		{
			id: "btn-export-payroll-t51",
			label: "Зарплатная ведомость",
			selector: '[data-testid="btn-export-payroll-t51"]',
			effect: "Рассчитывает процент врачей и ассистентов от чистой выручки (Net Revenue) без копеечных ошибок.",
			requiresConfirmation: false,
			role: ["owner"],
		},
	],
	selectors: {
		kpiCardsGrid: '[data-testid="analytics-kpi-cards-grid"]',
		revenueChart: '[data-testid="analytics-revenue-chart"]',
		chairUtilizationBar: '[data-testid="chair-utilization-bar"]',
	},
	visualGuides: [
		{
			element: "Карточки ключевых показателей (KPI)",
			selector: '[data-testid="analytics-kpi-cards-grid"]',
			description: "Выручка, средний чек, количество визитов и конверсия планов лечения.",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Выбор периода -> 2. Анализ динамики выручки -> 3. Проверка загрузки кресел -> 4. Расчёт мотивации врачей.",
	faq: [
		{
			question: "Учитываются ли скидки при расчёте зарплаты доктора?",
			answer: "Да, система считает зарплату строго от реально оплаченных сумм с учётом персональных скидок.",
		},
	],
	troubleshooting: [
		{
			symptom: "График выручки показывает 0 руб за сегодня",
			cause: "Кассовая смена ещё не была закрыта либо все визиты оформлены без оплаты.",
			solution: "Проверьте раздел Касса и статус закрытых визитов.",
		},
	],
	scaleAdaptability: "Соло-врач видит свой личный чистый доход. Владелец сети видит сравнение филиалов.",
	complianceNotes: "Управленческий учёт, форма Т-51 расчёта заработной платы, ст. 149 НК РФ.",
	keywords: ["аналитика", "выручка", "отчёты", "зарплата", "т51", "кпи", "kpi", "средний чек", "загрузка кресел"],
};

export const CHAIRSIDE_COPILOT_COMPONENT: CrmComponentKnowledge = {
	id: "chairside_copilot",
	name: "Клинический ИИ-ассистент ДЕНТА",
	shortName: "ИИ-ассистент",
	category: "ai_assistant",
	categoryRu: "ИИ-ассистент",
	description:
		"Интеллектуальный ассистент врача у кресла. Принимает голосовые и текстовые команды, ищет знания по программе, заполняет карту и предлагает сметы.",
	route: "copilot",
	primaryRole: ["doctor", "admin", "all"],
	tier: 1,
	primaryActions: [
		{
			id: "btn-toggle-copilot",
			label: "Открыть ДЕНТУ",
			selector: '[data-testid="btn-toggle-copilot"], [data-tour="copilot-toggle"]',
			hotkey: "Ctrl+Space",
			effect: "Выдвигает боковую панель ассистента у кресла без сдвига основного контента.",
			requiresConfirmation: false,
			role: ["all"],
		},
		{
			id: "btn-voice-dictation",
			label: "Голосовой ввод у кресла",
			selector: '[data-testid="copilot-mic-btn"]',
			effect: "Включает стерильный голосовой набор без необходимости касаться клавиатуры руками в перчатках.",
			requiresConfirmation: false,
			role: ["doctor"],
		},
	],
	selectors: {
		drawer: '[data-testid="copilot-drawer"]',
		composerInput: '[data-testid="copilot-composer-input"]',
		suggestionsGrid: '[data-testid="copilot-suggestions-grid"]',
	},
	visualGuides: [
		{
			element: "Кнопка вызова ДЕНТЫ",
			selector: '[data-testid="btn-toggle-copilot"]',
			description: "Всегда доступна в правом углу или по хоткею Ctrl+Space.",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Врач лечит зуб -> 2. Говорит: 'ДЕНТА, запиши кариес 36 зуба' -> 3. Ассистент обновляет формулу -> 4. Смета готова.",
	faq: [
		{
			question: "Может ли ИИ самостоятельно подписать медицинскую карту или чек без врача?",
			answer: "Категорически нет! Мандат 8e гарантирует автономию врача: ИИ лишь черновик, утверждает только человек.",
		},
	],
	troubleshooting: [
		{
			symptom: "ИИ не отвечает при отсутствии интернета",
			cause: "Нет доступа к внешнему облачному LLM.",
			solution: "Включается детерминированный локальный роутер команд (copilotFallbackRouter) без потери скорости.",
		},
	],
	scaleAdaptability: "Работает в 1 клик для соло-врача и в мульти-кабинетной среде клиники.",
	complianceNotes: "Врачебная тайна, безопасность данных, zero-sycophancy протокол T.A.R.S.",
	keywords: ["ии", "ассистент", "copilot", "дента", "голос", "диктовка", "подсказки", "помощь"],
};

export const DOCUMENT_GENERATOR_COMPONENT: CrmComponentKnowledge = {
	id: "document_generator",
	name: "Документы, согласия и налоговый вычет",
	shortName: "Документы",
	category: "patient_management",
	categoryRu: "Документы и справки",
	description:
		"Генерация юридических и финансовых документов клиники: договоры на оказание услуг, ИДС, справка для налогового вычета 13% НДФЛ (ФНС КНД 1151156).",
	route: "documents",
	primaryRole: ["admin", "doctor", "owner"],
	tier: 2,
	primaryActions: [
		{
			id: "btn-generate-tax-deduction",
			label: "Справка для налоговой (НДФЛ 13%)",
			selector: '[data-testid="btn-generate-tax-knd1151156"]',
			effect: "Автоматически суммирует все оплаченные чеки за год и формирует справку КНД 1151156 для ФНС.",
			requiresConfirmation: false,
			role: ["admin", "owner"],
		},
		{
			id: "btn-print-blank-contract",
			label: "Печать договора с прочерками",
			selector: '[data-testid="btn-print-blank-contract"]',
			effect: "Печатает чистый бланк договора со строками '_______' для ручной подписи до осмотра без 403-ошибок.",
			requiresConfirmation: false,
			role: ["admin"],
		},
	],
	selectors: {
		documentsListTable: '[data-testid="patient-documents-table"]',
		taxSummaryAmount: '[data-testid="tax-deduction-total-amount"]',
	},
	visualGuides: [
		{
			element: "Кнопка справки в налоговую",
			selector: '[data-testid="btn-generate-tax-knd1151156"]',
			description: "1-кликовое оформление налогового вычета для пациента за любой год.",
			badgeText: "ФНС РФ",
			highlightType: "pulse",
		},
	],
	clinicalWorkflow:
		"1. Пациент просит справку для налоговой -> 2. Выбор года -> 3. Нажатие 'Справка для налоговой' -> 4. Готовый PDF на печать.",
	faq: [
		{
			question: "Можно ли распечатать договор с пациентом до того, как врач провёл осмотр?",
			answer: "Да! По Мандату 8e регистратор может распечатать договор с 0 руб и строками для ручного заполнения.",
		},
	],
	troubleshooting: [
		{
			symptom: "В справке для налоговой сумма меньше, чем ожидал пациент",
			cause: "Часть услуг была оказана родственнику без объединения в семейный баланс.",
			solution: "Объедините членов семьи в карточке пациента — суммы оплат синхронизируются автоматически.",
		},
	],
	scaleAdaptability: "Для соло-врача — быстрый бланк договора. Для клиники — полный юридический документооборот.",
	complianceNotes: "Приказ Минздрава/ФНС КНД 1151156, ст. 219 НК РФ, ст. 1051н информированные согласия.",
	keywords: ["документы", "договор", "идс", "налоговый вычет", "ндфл", "кнд 1151156", "справка", "печать", "согласие"],
};

export const FINANCE_ADMIN_COMPONENTS: readonly CrmComponentKnowledge[] = [
	KKT_CASHIER_COMPONENT,
	PATIENT_CARD_RECORD_COMPONENT,
	ANALYTICS_DASHBOARD_COMPONENT,
	CHAIRSIDE_COPILOT_COMPONENT,
	DOCUMENT_GENERATOR_COMPONENT,
];
