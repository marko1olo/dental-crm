import type { CrmComponentKnowledge } from "../schemas.js";

/**
 * Finance, Cashier, Patient Record, Analytics, Copilot & Document Components
 * Mandates: 8e (Doctor Autonomy / Cashier without INN), 8b (Anti-Monolith <800 lines), 8x (Plain Russian), 8n (Solo Doctor Sovereignty)
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
	navigationHint: "F9 или Alt+5 (вкладка #finance / Касса)",
	primaryRole: ["admin", "doctor", "owner"],
	tier: 1,
	hotkeys: {
		"F9": "Быстрый чекаут и фискализация чека 54-ФЗ",
		"Alt+S": "Комбинированная оплата (сплит в 3 клика: нал + карта + семья)",
		"Esc": "Закрыть окно оплаты / отмена",
	},
	quickTips: [
		"Мандат 8e: ИНН с пациентов-физлиц НЕ требуется по закону 54-ФЗ (ИНН нужен только юрлицам)",
		"При 100% скидке чек в ККТ не направляется (запрет ФФД 1.2), оформляется внутренний гарантийный акт",
		"Оплата картой POS или наличными без сдачи оформляется в 1 клик",
	],
	primaryActions: [
		{
			id: "btn-fast-checkout-tender",
			label: "Быстрый чекаут (F9)",
			selector: '[data-tour="cashier-pay"], [data-tour="fast-cashier"], #cashier-tender-action-btn',
			hotkey: "F9",
			effect: "Открывает окно быстрой оплаты визита или чекаута за 1 клик.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
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
		{
			id: "btn-cashier-split-payment",
			label: "Сплит-оплата (комбинированная)",
			selector: '[data-testid="cashier-split-payment-panel"], [data-testid="btn-split-payment"]',
			hotkey: "Alt+S",
			effect: "Разделение счёта между картой, наличными и семейным депозитом в 3 клика.",
			requiresConfirmation: false,
			role: ["admin", "doctor"],
		},
		{
			id: "btn-cashier-refund",
			label: "Оформить возврат прихода (54-ФЗ)",
			selector: '[data-tour="cashier-refund"], [data-testid="btn-cashier-refund"]',
			hotkey: "Alt+R",
			effect: "Оформляет фискальный возврат средств на банковскую карту или наличными с формированием чека возврата прихода.",
			requiresConfirmation: false,
			role: ["admin", "doctor", "owner"],
		},
		{
			id: "btn-apply-guarantee-discount",
			label: "Скидка по гарантии 100%",
			selector: '[data-tour="guarantee-discount"], [data-testid="btn-apply-guarantee-discount"]',
			effect: "Применяет 100% скидку на гарантийные переделки врача. Сумма к оплате 0.00 ₽. Чек 54-ФЗ не выбивается (запрет ФФД 1.2), оформляется внутренний Гарантийный Акт списания (Мандат 8e).",
			requiresConfirmation: false,
			role: ["doctor", "admin"],
		},
	],
	selectors: {
		tenderButton: '[data-tour="cashier-pay"], [data-tour="fast-cashier"], #cashier-tender-action-btn',
		totalDueAmount: '[data-testid="cashier-total-due-rub"]',
		splitPaymentPanel: '[data-testid="cashier-split-payment-panel"]',
		refundButton: '[data-tour="cashier-refund"], [data-testid="btn-cashier-refund"]',
		guaranteeDiscountButton: '[data-tour="guarantee-discount"], [data-testid="btn-apply-guarantee-discount"]',
		kktStatusIndicator: '[data-testid="kkt-lan-status-indicator"]',
		receiptPrintHistory: '[data-testid="cashier-receipts-table"]',
		posCardButton: '[data-testid="btn-pay-pos-card"]',
		sbpQrButton: '[data-testid="btn-pay-sbp-qr"]',
	},
	visualGuides: [
		{
			element: "Кнопки быстрой оплаты",
			selector: '[data-tour="cashier-pay"], [data-testid="btn-pay-pos-card"]',
			description: "1-кликовая оплата картой или наличными без блокирующих модалок.",
			badgeText: "F9",
			highlightType: "pulse",
		},
		{
			element: "Сплит-оплата счета",
			selector: '[data-testid="cashier-split-payment-panel"]',
			description: "Разделение чека на части (например, 3000 нал + 2000 карта).",
			badgeText: "Alt+S",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Завершение приёма (Space/Enter) -> 2. Быстрый чекаут (F9) -> 3. Выбор способа оплаты (Карта/Нал/СБП/Сплит) -> 4. Чек 54-ФЗ автоматически печатается и фискализируется в ОФД.",
	faq: [
		{
			question: "Требует ли программа ИНН с пациента-физлица?",
			answer: "Нет! По закону 54-ФЗ и Мандату 8e ИНН обязателен только юрлицам. С физлиц он не запрашивается.",
		},
		{
			question: "Что происходит при 100% скидке (гарантийная переделка 0 руб)?",
			answer: "Чек в кассу не пробивается (по ФФД 1.2 нулевой чек запрещён), оформляется внутренний гарантийный акт.",
		},
		{
			question: "Как оформить возврат денежных средств пациенту?",
			answer: "В кассовом журнале выберите нужный чек и нажмите 'Оформить возврат' (Alt+R, селектор [data-tour='cashier-refund']). Фискальный регистратор пробьёт чек 'Возврат прихода'.",
		},
		{
			question: "Как применить скидку по гарантии на лечение?",
			answer: "В окне оплаты или смете выберите 'Скидка по гарантии 100%'. Врач автономен (Мандат 8e) — чек в кассу не отправляется, формируется Гарантийный Акт.",
		},
		{
			question: "Как пробить чек с частичной оплатой с семейного депозита?",
			answer: "Нажмите Alt+S (Сплит), выберите семейный депозит и укажите остаток к оплате картой.",
		},
	],
	troubleshooting: [
		{
			symptom: "Как оформить возврат денежных средств пациенту (возврат прихода 54-ФЗ)?",
			cause: "Отказ от лечения, ошибочный чек или возврат средств за неоказанную услугу.",
			solution: "В разделе Касса (F9) откройте журнал чеков, выберите нужную операцию и нажмите 'Оформить возврат' (Alt+R, селектор [data-tour='cashier-refund']). ККТ пробьёт фискальный чек 'Возврат прихода'. При 100% гарантийной переделке чек не выбивается, а оформляется Акт списания.",
			recoverySelector: '[data-tour="cashier-refund"], [data-tour="cashier-pay"], #cashier-tender-action-btn',
		},
		{
			symptom: "Как применить скидку по гарантии на переделку лечения?",
			cause: "Гарантийная переделка работы врача в течение гарантийного периода.",
			solution: "В смете приёма или кассе нажмите кнопку 'Скидка по гарантии 100%' (селектор [data-tour='guarantee-discount']). Врач автономен (Мандат 8e) — согласование не требуется. Сумма счёта становится 0.00 ₽, чек 54-ФЗ не выбивается (ФФД 1.2 запрещает нулевые чеки), система генерирует Акт гарантийного обслуживания.",
			recoverySelector: '[data-tour="guarantee-discount"], [data-tour="cashier-pay"]',
		},
		{
			symptom: "Ошибка связи с кассой (LAN timeout)",
			cause: "Кассовый аппарат выключен или сменился IP-адрес в локальной сети.",
			solution: "Чек автоматически ставится в офлайн-очередь с автоповтором и пробьётся при восстановлении связи.",
			recoverySelector: '[data-tour="cashier-pay"], [data-testid="btn-pay-pos-card"]',
		},
		{
			symptom: "Пациент платит частью картой, частью наличными (сплит)",
			cause: "По умолчанию активен одиночный метод оплаты.",
			solution: "Нажмите Alt+S или откройте панель сплит-оплаты [data-testid='cashier-split-payment-panel'], укажите суммы каждого метода и пробейте чек.",
			recoverySelector: '[data-testid="cashier-split-payment-panel"]',
		},
		{
			symptom: "Касса выдаёт ошибку при сумме 0.00 руб (100% гарантийная скидка)",
			cause: "ФФД 1.2 запрещает отправку нулевых чеков в ККТ.",
			solution: "По Мандату 8e чек на 0.00 руб не посылается в кассу; система автоматически формирует внутренний Гарантийный Акт без обращения к фискальнику.",
			recoverySelector: '[data-tour="cashier-pay"]',
		},
	],
	scaleAdaptability: "Соло-врач пробивает чек сам за 2 клика. Ресепшен клиники обслуживает сплит-платежи семьи.",
	complianceNotes: "54-ФЗ, ФФД 1.2, теги НДС (освобождено по ст. 149 НК РФ), QR-код чека ФНС.",
	keywords: [
		"касса",
		"чек",
		"54фз",
		"возврат",
		"возврат прихода",
		"чек коррекции",
		"оформить возврат",
		"скидка по гарантии",
		"гарантия",
		"гарантийный",
		"скидка",
		"оплата",
		"терминал",
		"наличные",
		"сбп",
		"qr",
		"фискализация",
		"офд",
		"F9",
		"Alt+S",
		"Alt+R",
		"сплит",
	],
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
	navigationHint: "Ctrl+K / Cmd+K или Alt+3 (раздел Пациенты)",
	primaryRole: ["admin", "doctor", "all"],
	tier: 1,
	hotkeys: {
		"Ctrl+K / Cmd+K / F1": "Глобальный поиск пациента по ФИО, телефону или номеру карты (50 мс)",
		"Shift+N": "Соматически здоров / норма в 1 клик",
		"Esc": "Закрыть строку поиска или карточку",
	},
	quickTips: [
		"Ctrl+K находит пациента за 50 миллисекунд из любого раздела CRM",
		"Мандат 8e / 8i: стоматологический соматический статус сфокусирован на аллергиях и гемостазе без 50 вопросов стационара",
		"Аллергия отображается как пассивная плашка без блокировок врача",
	],
	primaryActions: [
		{
			id: "btn-omnibar-search",
			label: "Поиск пациента (Ctrl+K)",
			selector: '[data-tour="global-search-input"], [data-tour="reception-search"], #omnibar-input, [data-testid="patients-search-input"]',
			hotkey: "Ctrl+K / F1",
			effect: "Мгновенный поиск пациента по ФИО, телефону или номеру карты за 50 миллисекунд.",
			requiresConfirmation: false,
			role: ["all"],
		},
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
			hotkey: "Shift+N",
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
		globalSearch: '[data-tour="global-search-input"], [data-tour="reception-search"], #omnibar-input',
		patientSearchBar: '[data-testid="patients-search-input"]',
		patientListTable: '[data-testid="patients-list-table"]',
		patientAllergyBanner: '[data-testid="patient-allergy-alert-banner"]',
		patientFamilyWallet: '[data-testid="patient-family-wallet-badge"]',
		createPatientButton: '[data-testid="btn-create-patient"]',
	},
	visualGuides: [
		{
			element: "Поиск пациентов",
			selector: '[data-tour="global-search-input"], [data-testid="patients-search-input"]',
			description: "Мгновенный поиск по номеру телефона, фамилии или номеру карты.",
			badgeText: "Ctrl+K",
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
		{
			question: "Как объединить счета родителей и детей в один кошелек?",
			answer: "В карточке пациента откройте 'Семейный счёт' и добавьте членов семьи — баланс станет общим.",
		},
	],
	troubleshooting: [
		{
			symptom: "Не находит пациента по номеру телефона",
			cause: "Номер введён с пробелами или нестандартным кодом страны.",
			solution: "Система автоматически нормализует номера в формат +7 (9XX) XXX-XX-XX при вводе от 10 цифр.",
			recoverySelector: '[data-tour="global-search-input"], #omnibar-input',
		},
		{
			symptom: "Требуется быстро открыть карту во время телефонного звонка",
			cause: "Поиск мышью отнимает время администратора.",
			solution: "Нажмите Ctrl+K, введите первые 3 цифры номера или фамилию и нажмите Enter — карта откроется моментально.",
			recoverySelector: '#omnibar-input',
		},
	],
	scaleAdaptability: "Для соло-врача — быстрый список своих пациентов. Для сети — централизованная база с защитой ПДн.",
	complianceNotes: "Федеральный закон 152-ФЗ 'О персональных данных', медицинская тайна ст. 13 323-ФЗ.",
	keywords: ["пациент", "карточка", "поиск", "телефон", "аллергия", "баланс", "семья", "соматика", "Ctrl+K", "Shift+N"],
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
	navigationHint: "Раздел Аналитика",
	primaryRole: ["owner", "admin"],
	tier: 3,
	hotkeys: {
		"Esc": "Закрыть отчёт / панель",
	},
	quickTips: [
		"Мандат 8e: зарплата врачей считается строго от чистой выручки за вычетом скидок",
		"Загрузка кресел отображает реальную эффективность кабинетов без ручных калькуляторов",
	],
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
		payrollExportButton: '[data-testid="btn-export-payroll-t51"]',
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
			recoverySelector: '[data-testid="analytics-period-month"]',
		},
		{
			symptom: "Расхождения в расчёте зарплаты врачей",
			cause: "Учёт скидок или возвратов.",
			solution: "Система рассчитывает мотивацию по форме Т-51 строго от чистой поступившей выручки (Net Revenue) с учётом скидок.",
			recoverySelector: '[data-testid="btn-export-payroll-t51"]',
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
	navigationHint: "Ctrl+Space (вызов боковой панели ДЕНТА)",
	primaryRole: ["doctor", "admin", "all"],
	tier: 1,
	hotkeys: {
		"Ctrl+Space": "Выдвинуть / скрыть боковую панель ассистента ДЕНТА",
		"Esc": "Закрыть панель Копилота",
	},
	quickTips: [
		"Мандат 8e: Копилот предлагает только черновики; подпись карты и чека всегда выполняет врач",
		"При обрыве интернета включается детерминированный локальный роутер команд без задержек",
		"Голосовой ввод позволяет врачу в стерильных перчатках надиктовывать патологию зубов",
	],
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
		micButton: '[data-testid="copilot-mic-btn"]',
		toggleButton: '[data-testid="btn-toggle-copilot"], [data-tour="copilot-toggle"]',
	},
	visualGuides: [
		{
			element: "Кнопка вызова ДЕНТЫ",
			selector: '[data-testid="btn-toggle-copilot"], [data-tour="copilot-toggle"]',
			description: "Всегда доступна в правом углу или по хоткею Ctrl+Space.",
			badgeText: "Ctrl+Space",
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
		{
			question: "Работает ли Копилот при обрыве интернета?",
			answer: "Да! Включается детерминированный локальный роутер команд (copilotFallbackRouter) без потери скорости.",
		},
	],
	troubleshooting: [
		{
			symptom: "ИИ не отвечает при отсутствии интернета",
			cause: "Нет доступа к внешнему облачному LLM.",
			solution: "Включается детерминированный локальный роутер команд (copilotFallbackRouter) без потери скорости.",
			recoverySelector: '[data-testid="copilot-composer-input"]',
		},
		{
			symptom: "Копилот не распознал нестандартную стоматологическую формулировку",
			cause: "Шум в кабинете или сложная грамматика.",
			solution: "Используйте короткие медицинские команды (например, 'зуб 26 кариес О норма') или воспользуйтесь хоткеями одонтограммы напрямую.",
			recoverySelector: '[data-testid="copilot-composer-input"]',
		},
	],
	scaleAdaptability: "Работает в 1 клик для соло-врача и в мульти-кабинетной среде клиники.",
	complianceNotes: "Врачебная тайна, безопасность данных, zero-sycophancy протокол T.A.R.S.",
	keywords: ["ии", "ассистент", "copilot", "дента", "голос", "диктовка", "подсказки", "помощь", "Ctrl+Space"],
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
	navigationHint: "Alt+4 (раздел Документы)",
	primaryRole: ["admin", "doctor", "owner"],
	tier: 2,
	hotkeys: {
		"Ctrl+P": "Печать пакета документов / договора / согласий",
		"Esc": "Закрыть предпросмотр документа",
	},
	quickTips: [
		"Мандат 8e: администратор имеет право распечатать пустой договор со строками '_______' до осмотра без 403-ошибок",
		"Справка для налогового вычета 13% НДФЛ (КНД 1151156) формируется в 1 клик по всем чекам за год",
		"Печать в magazine-grade типографике со всеми реквизитами клиники",
	],
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
			selector: '[data-tour="print-contract-btn"], [data-tour="print-blank-contract-btn"], [data-testid="btn-print-blank-contract"]',
			hotkey: "Ctrl+P",
			effect: "Печатает чистый бланк договора со строками '_______' для ручной подписи до осмотра без 403-ошибок.",
			requiresConfirmation: false,
			role: ["admin"],
		},
	],
	selectors: {
		documentsListTable: '[data-testid="patient-documents-table"]',
		taxSummaryAmount: '[data-testid="tax-deduction-total-amount"]',
		blankContractButton: '[data-tour="print-blank-contract-btn"], [data-testid="btn-print-blank-contract"]',
		taxDeductionButton: '[data-testid="btn-generate-tax-knd1151156"]',
	},
	visualGuides: [
		{
			element: "Кнопка справки в налоговую",
			selector: '[data-testid="btn-generate-tax-knd1151156"]',
			description: "1-кликовое оформление налогового вычета для пациента за любой год.",
			badgeText: "ФНС РФ",
			highlightType: "pulse",
		},
		{
			element: "Печать бланка договора",
			selector: '[data-tour="print-blank-contract-btn"], [data-testid="btn-print-blank-contract"]',
			description: "Печать договора первичного пациента до осмотра без блокировок.",
			badgeText: "Ctrl+P",
			highlightType: "outline",
		},
	],
	clinicalWorkflow:
		"1. Пациент просит справку для налоговой -> 2. Выбор года -> 3. Нажатие 'Справка для налоговой' -> 4. Готовый PDF на печать.",
	faq: [
		{
			question: "Можно ли распечатать договор с пациентом до того, как врач провёл осмотр?",
			answer: "Да! По Мандату 8e регистратор может распечатать договор с 0 руб и строками для ручного заполнения.",
		},
		{
			question: "Какая форма утверждена для налогового вычета?",
			answer: "Приказ ФНС РФ КНД 1151156 (Справка об оплате медицинских услуг для представления в налоговые органы).",
		},
	],
	troubleshooting: [
		{
			symptom: "В справке для налоговой сумма меньше, чем ожидал пациент",
			cause: "Часть услуг была оказана родственнику без объединения в семейный баланс.",
			solution: "Объедините членов семьи в карточке пациента — суммы оплат синхронизируются автоматически.",
			recoverySelector: '[data-testid="btn-generate-tax-knd1151156"]',
		},
		{
			symptom: "Регистратор не может распечатать договор новому пациенту до визита",
			cause: "Ошибочное предположение о необходимости суммы в договоре.",
			solution: "По Мандату 8e разрешена печать бланка со строками '_______' с 0 руб; нажмите 'Печать договора с прочерками' [data-tour='print-blank-contract-btn'].",
			recoverySelector: '[data-tour="print-blank-contract-btn"], [data-testid="btn-print-blank-contract"]',
		},
	],
	scaleAdaptability: "Для соло-врача — быстрый бланк договора. Для клиники — полный юридический документооборот.",
	complianceNotes: "Приказ Минздрава/ФНС КНД 1151156, ст. 219 НК РФ, ст. 1051н информированные согласия.",
	keywords: ["документы", "договор", "идс", "налоговый вычет", "ндфл", "кнд 1151156", "справка", "печать", "согласие", "Ctrl+P"],
};

export const FINANCE_ADMIN_COMPONENTS: readonly CrmComponentKnowledge[] = [
	KKT_CASHIER_COMPONENT,
	PATIENT_CARD_RECORD_COMPONENT,
	ANALYTICS_DASHBOARD_COMPONENT,
	CHAIRSIDE_COPILOT_COMPONENT,
	DOCUMENT_GENERATOR_COMPONENT,
];
