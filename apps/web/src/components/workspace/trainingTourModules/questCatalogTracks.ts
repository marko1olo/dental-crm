/**
 * questCatalogTracks.ts
 *
 * Clinical Quest Tracks Catalog: Solo Doctor, Reception Admin, Imaging & Diagnostics.
 * Mandates 8d (Zero emojis), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty).
 */

import type { QuestStep, QuestTrack } from "./trainingTourTypes";

// ---------------------------------------------------------------------------
// TRACK 1: Соло-врач (Быстрый старт: Расписание -> Формула -> Дневник -> Касса)
// ---------------------------------------------------------------------------
export const SOLO_DOCTOR_TRACK_STEPS: readonly QuestStep[] = [
	{
		id: "schedule_1click",
		stepNumber: 1,
		title: "Быстрая запись в расписании",
		badge: "Расписание",
		description:
			"Кликните в свободную ячейку сетки или нажмите кнопку «+ Запись». Приём бронируется за 5 секунд без принудительного выбора ассистента.",
		clinicalTip:
			"Быстрый старт: соло-врач не тратит время на лишние поля и бюрократические согласования.",
		shortcutBadge: "Space / Enter — старт и финиш приёма",
		targetSelector: '[data-tour="schedule-booking"], #topbar-booking-action-btn, [data-tour="schedule-slot"]',
		fallbackTargetSelector: '.top-actions .primary-button',
		viewTarget: "schedule",
		actionLabel: "Открыть расписание",
		rewardBadge: "+1 к скорости записи",
		arrowDirection: "down",
		actionTrigger: {
			type: "click",
		},
	},
	{
		id: "odontogram_formula",
		stepNumber: 2,
		title: "Зубная формула и одонтограмма",
		badge: "Зубная формула",
		description:
			"Нажмите клавиши 1..8 для выбора квадранта или кликните по зубу в дуге FDI. Для здоровых зубов нажмите «Норма» (Shift+N) — вся формула заполнится автоматически. Патологии отмечаются клавишами: C (кариес), P (пульпит), K (коронка), X (удален).",
		clinicalTip:
			"Физиологическая норма по умолчанию: отмечается только реальная клиническая патология.",
		shortcutBadge: "Shift+N — норма • C, P, K, X — патологии",
		targetSelector: '[data-tour="tooth-card"], [data-tour="autonorm-btn"], [data-tour="odontogram-formula"]',
		fallbackTargetSelector: 'a[href="#visit"]',
		viewTarget: "visit",
		actionLabel: "Открыть одонтограмму",
		rewardBadge: "+1 к скорости осмотра",
		arrowDirection: "up",
		actionTrigger: {
			type: "keyboard",
			key: "N",
			shiftKey: true,
		},
	},
	{
		id: "visit_diary_043",
		stepNumber: 3,
		title: "Протокол приёма и медицинская карта",
		badge: "Дневник приёма",
		description:
			"Используйте готовые клинические протоколы (терапия, ортопедия, хирургия) или диктуйте голосом. Черновик сохраняется на лету (Ctrl+S). Печать карты, согласий и смет доступна в любой момент без ожидания (F12).",
		clinicalTip:
			"Черновики дневников сохраняются автоматически с версионным аудитом.",
		shortcutBadge: "Ctrl+S — автосохранение • F12 — печать карты",
		targetSelector: '[data-tour="diary-preset"], [data-tour="visit-diary"], #diary-autosave-status',
		fallbackTargetSelector: 'a[href="#visit"]',
		viewTarget: "visit",
		actionLabel: "Открыть дневник приёма",
		rewardBadge: "+1 к оформленным протоколам",
		arrowDirection: "left",
		actionTrigger: {
			type: "keyboard",
			key: "s",
			ctrlKey: true,
		},
	},
	{
		id: "fast_cashier_54fz",
		stepNumber: 4,
		title: "Касса и приём оплаты",
		badge: "Касса и чеки",
		description:
			"Нажмите F9 для мгновенного чекаута. Оплата принимается в 3 клика: наличные, банковская карта, СБП QR или баланс семьи. ИНН с физических лиц не требуется. Чек формируется с точностью до копейки.",
		clinicalTip:
			"Поддержка гарантийных переделок и скидок врача непосредственно в смете.",
		shortcutBadge: "F9 — быстрый чек • Сплит: нал + карта + семья",
		targetSelector: '[data-tour="cashier-pay"], [data-tour="fast-cashier"], #cashier-tender-action-btn, [data-testid="payment-submit-button"]',
		fallbackTargetSelector: 'a[href="#finance"], [data-testid="btn-finance-open-cashbox"]',
		viewTarget: "finance",
		actionLabel: "Открыть кассу",
		rewardBadge: "+1 к чистым чекам без долгов",
		arrowDirection: "up",
		actionTrigger: {
			type: "keyboard",
			key: "F9",
		},
	},
];

// ---------------------------------------------------------------------------
// TRACK 2: Регистратура и администратор (Звонок -> Запись -> Договор -> Чек)
// ---------------------------------------------------------------------------
export const RECEPTION_ADMIN_TRACK_STEPS: readonly QuestStep[] = [
	{
		id: "reception_search",
		stepNumber: 1,
		title: "Быстрый поиск пациента и звонок",
		badge: "Регистратура",
		description:
			"Нажмите Ctrl+K или кликните в строку поиска. Поиск находит пациента по ФИО, номеру телефона или полису за 50 миллисекунд.",
		clinicalTip:
			"Звонки и софтфон не блокируют экран врача: спокойная работа без вокзального шума.",
		shortcutBadge: "Ctrl+K / Cmd+K — быстрый поиск пациента",
		targetSelector: '[data-tour="global-search-input"], [data-tour="reception-search"], #omnibar-input',
		fallbackTargetSelector: '#topbar-booking-action-btn',
		viewTarget: "patients",
		actionLabel: "Поиск пациента",
		rewardBadge: "+1 к скорости на ресепшене",
		arrowDirection: "down",
		actionTrigger: {
			type: "keyboard",
			key: "k",
			ctrlKey: true,
		},
	},
	{
		id: "reception_slot",
		stepNumber: 2,
		title: "Бронирование слота в расписании",
		badge: "Сетка дня",
		description:
			"Кликните свободный интервал в кресле или кнопку записи. Время бронируется мгновенно с автоматическим расчётом длительности.",
		clinicalTip:
			"Плотная сетка без наездов: четкие интервалы 15, 30 или 60 минут без паразитных полос.",
		shortcutBadge: "Enter — подтвердить запись",
		targetSelector: '[data-tour="schedule-slot"], [data-tour="schedule-booking"], #topbar-booking-action-btn',
		fallbackTargetSelector: 'a[href="#schedule"]',
		viewTarget: "schedule",
		actionLabel: "Открыть расписание",
		rewardBadge: "+1 к дисциплине расписания",
		arrowDirection: "right",
		actionTrigger: {
			type: "click",
		},
	},
	{
		id: "reception_contract",
		stepNumber: 3,
		title: "Печать договора первичного пациента",
		badge: "Документы",
		description:
			"Распечатайте договор оказания медицинских услуг до приёма. Разрешена печать с нулевой суммой и строками для ручной подписи.",
		clinicalTip:
			"Без 403-ошибок: администратор имеет полное право распечатать договор пациенту на стойке.",
		shortcutBadge: "Ctrl+P / Печать пакета документов",
		targetSelector: '[data-tour="print-contract-btn"], [data-tour="documents-nav"], a[href="#documents"]',
		fallbackTargetSelector: 'a[href="#documents"]',
		viewTarget: "documents",
		actionLabel: "Открыть документы",
		rewardBadge: "+1 к юридической защите клиники",
		arrowDirection: "left",
		actionTrigger: {
			type: "click",
		},
	},
	{
		id: "reception_receipt",
		stepNumber: 4,
		title: "Кассовый чек и оплата по QR",
		badge: "Оплата",
		description:
			"Примите оплату картой через терминал или покажите пациенту экранный QR-код СБП. Фискальный чек выбивается за 2 секунды.",
		clinicalTip:
			"ИНН физлица не требуется: оформление чека без выдуманных преград и задержек очереди.",
		shortcutBadge: "F9 — быстрый чек • QR СБП 0% эквайринг",
		targetSelector: '[data-tour="cashier-pay"], [data-tour="fast-cashier"], #cashier-tender-action-btn',
		fallbackTargetSelector: 'a[href="#finance"]',
		viewTarget: "finance",
		actionLabel: "Открыть кассу",
		rewardBadge: "+1 к безошибочной кассе",
		arrowDirection: "up",
		actionTrigger: {
			type: "click",
		},
	},
];

// ---------------------------------------------------------------------------
// TRACK 3: КТ и диагностика (Открытие снимка -> Срезы MPR -> Замер гребня)
// ---------------------------------------------------------------------------
export const IMAGING_DIAGNOSTICS_TRACK_STEPS: readonly QuestStep[] = [
	{
		id: "imaging_open",
		stepNumber: 1,
		title: "Открытие снимка визиографа или КТ",
		badge: "Рентген и КТ",
		description:
			"Нажмите F7 для быстрого снимка с датчика или выберите исследование в галерее. Снимок открывается менее чем за 50 миллисекунд.",
		clinicalTip:
			"Мгновенный просмотр без задержек: никакой обязательной блокировки на тяжелые нейросети.",
		shortcutBadge: "F7 — снимок визиографа • 0 мс задержки",
		targetSelector: '[data-tour="imaging-nav"], [data-tour="visiograph-open"], a[href="#imaging"]',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Открыть снимки",
		rewardBadge: "+1 к четкости диагностики",
		arrowDirection: "right",
		actionTrigger: {
			type: "keyboard",
			key: "F7",
		},
	},
	{
		id: "imaging_mpr",
		stepNumber: 2,
		title: "Мультипланарная реконструкция MPR",
		badge: "3D Срезы",
		description:
			"Переключайтесь между аксиальным, сагиттальным и корональным срезами. Контрастность настраивается пресетом «Кость / Зуб».",
		clinicalTip:
			"Тёмная тема рентген-кабинета (WCAG AAA): фон slate-950 бережёт глаза при оценке снимков.",
		shortcutBadge: "Колесо мыши — прокрутка срезов",
		targetSelector: '[data-tour="mpr-presets"], [data-tour="imaging-filter"], #dicom-mpr-toolbar',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Срезы томограммы",
		rewardBadge: "+1 к 3D-навигации",
		arrowDirection: "down",
		actionTrigger: {
			type: "click",
		},
	},
	{
		id: "imaging_measure",
		stepNumber: 3,
		title: "Калиброванная линейка и замер гребня",
		badge: "Линейка",
		description:
			"Выберите инструмент измерения для замера высоты и ширины альвеолярного гребня перед имплантацией с точностью до десятой доли миллиметра.",
		clinicalTip:
			"Безопасная имплантология: расчет дистанции до нижнечелюстного канала и гайморовой пазухи.",
		shortcutBadge: "Линейка / Замер костного объема",
		targetSelector: '[data-tour="dicom-ruler"], [data-tour="imaging-measure"], #dicom-ruler-btn',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Инструмент линейка",
		rewardBadge: "+1 к точности имплантации",
		arrowDirection: "left",
		actionTrigger: {
			type: "click",
		},
	},
];

// ---------------------------------------------------------------------------
// ALL TRACKS CATALOG
// ---------------------------------------------------------------------------
export const CLINICAL_QUEST_TRACKS: readonly QuestTrack[] = [
	{
		id: "solo_doctor",
		title: "Быстрый старт соло-врача",
		shortTitle: "Соло-врач",
		description: "4 ключевые операции за креслом: расписание, зубная формула, медицинская карта и касса.",
		roleBadge: "Врач-стоматолог",
		estimatedMinutes: 2,
		steps: SOLO_DOCTOR_TRACK_STEPS,
	},
	{
		id: "reception_admin",
		title: "Регистратура и администратор",
		shortTitle: "Регистратура",
		description: "Быстрый приём первичных пациентов: быстрый поиск, бронь времени, договор и чек.",
		roleBadge: "Администратор",
		estimatedMinutes: 2,
		steps: RECEPTION_ADMIN_TRACK_STEPS,
	},
	{
		id: "imaging_diagnostics",
		title: "Рентген, КТ и диагностика",
		shortTitle: "КТ и рентген",
		description: "Работа с визиографом, 3D томографией MPR и точные замеры костного гребня.",
		roleBadge: "Диагностика",
		estimatedMinutes: 2,
		steps: IMAGING_DIAGNOSTICS_TRACK_STEPS,
	},
];
