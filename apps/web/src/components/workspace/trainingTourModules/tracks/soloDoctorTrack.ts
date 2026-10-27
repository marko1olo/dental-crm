import type { QuestStep } from "../trainingTourTypes";

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
