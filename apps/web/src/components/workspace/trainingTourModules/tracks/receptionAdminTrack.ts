import type { QuestStep } from "../trainingTourTypes";

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
