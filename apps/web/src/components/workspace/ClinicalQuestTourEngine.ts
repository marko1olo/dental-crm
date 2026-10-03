/**
 * ClinicalQuestTourEngine.ts
 *
 * DENTE CRM — Interactive Game Quest Tour & Guided Coach Marks Engine
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero obstacles, no forced wizards).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero visual landfill, zero cartoon emojis).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-click workflows).
 * - Mandate 8p: The Elephant in the Room (No permanent blocking clutter).
 * - Mandate 8l: Guided Interactive Onboarding & Game Tour Inquisitor.
 *
 * Features:
 * 1. Multi-Track Scenarios:
 *    - Track A: "solo_doctor" (Schedule -> Odontogram -> Diary -> Cashier)
 *    - Track B: "reception_admin" (Call / Search -> Booking -> Contract -> Receipt 54-FZ)
 *    - Track C: "imaging_diagnostics" (Visiograph / CT -> MPR Slices -> Bone Ridge Caliper)
 * 2. Action Triggers (Reactive Quest Tracker):
 *    - Automatically advances when user performs REAL interactive action (clicking target button,
 *      pressing hotkey Shift+N / Ctrl+S / F9, or emitting custom completion event).
 * 3. Non-Blocking Ergonomics:
 *    - Pointer-events: none on highlight beacon, target remains clickable.
 *    - Step skipping ("Пропустить шаг") and permanent dismissal ("Больше не показывать").
 *    - LocalStorage persistence with full track and step history.
 * 4. Zero Emojis: Strictly clinical SVG / Lucide icons and clean Russian typography.
 */

export const DENTE_TOUR_STORAGE_KEY = "dente_tour_completed";
export const DENTE_QUEST_PROGRESS_STORAGE_KEY = "dente_quest_progress_v2";

export type QuestTrackId = "solo_doctor" | "reception_admin" | "imaging_diagnostics";

export type QuestArrowDirection = "up" | "down" | "left" | "right";

export interface QuestActionTrigger {
	readonly type: "click" | "keyboard" | "custom_event";
	readonly key?: string;
	readonly shiftKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly eventName?: string;
}

export interface QuestStep {
	readonly id: string;
	readonly stepNumber: number;
	readonly title: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalTip: string;
	readonly shortcutBadge: string;
	readonly targetSelector: string;
	readonly fallbackTargetSelector?: string;
	readonly viewTarget?: string;
	readonly actionLabel: string;
	readonly rewardBadge: string;
	readonly arrowDirection: QuestArrowDirection;
	readonly actionTrigger: QuestActionTrigger;
}

export interface QuestTrack {
	readonly id: QuestTrackId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly roleBadge: string;
	readonly estimatedMinutes: number;
	readonly steps: readonly QuestStep[];
}

export interface QuestTrackProgress {
	readonly completed: boolean;
	readonly completedStepIds: readonly string[];
}

export interface QuestProgressState {
	readonly activeTrackId: QuestTrackId;
	readonly currentStepIndex: number;
	readonly completedStepIds: readonly string[];
	readonly isTourActive: boolean;
	readonly isDismissedPermanently: boolean;
	readonly tracksProgress: Record<QuestTrackId, QuestTrackProgress>;
}

// ---------------------------------------------------------------------------
// TRACK 1: Соло-врач (Быстрый старт: Расписание -> Формула -> Дневник -> Касса)
// ---------------------------------------------------------------------------
export const SOLO_DOCTOR_TRACK_STEPS: readonly QuestStep[] = [
	{
		id: "schedule_1click",
		stepNumber: 1,
		title: "Запись в расписании за 1 клик",
		badge: "Расписание",
		description:
			"Кликните в свободную ячейку сетки или нажмите кнопку «+ Запись». Приём бронируется за 5 секунд без принудительного выбора ассистента.",
		clinicalTip:
			"0-клик старт: соло-врач не тратит время на лишние поля и бюрократические согласования.",
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
			"Нажмите клавиши 1..8 для выбора квадранта или кликните по зубу в дуге FDI. Для здоровых зубов нажмите «Норма» (Shift+N) — вся формула заполнится в 1 клик. Патологии отмечаются клавишами: C (кариес), P (пульпит), K (коронка), X (удален).",
		clinicalTip:
			"Физиологическая норма по умолчанию: отмечается только реальная клиническая патология.",
		shortcutBadge: "Shift+N — норма в 1 клик • C, P, K, X — патологии",
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
			"Никаких запретов на черновики и согласований начмедов: врач автономен в заполнении карты.",
		shortcutBadge: "Ctrl+S — автосохранение • F12 — печать карты",
		targetSelector: '[data-tour="diary-preset"], [data-tour="visit-diary"], #diary-autosave-status',
		fallbackTargetSelector: 'a[href="#visit"]',
		viewTarget: "visit",
		actionLabel: "Открыть дневник приёма",
		rewardBadge: "+1 к протоколам без бюрократии",
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
			"Нажмите F9 для мгновенного чекаута. Оплата принимается в 3 клика: наличные, банковская карта, СБП QR или баланс семьи. По 54-ФЗ ИНН с физических лиц не требуется. Чек формируется с точностью до копейки.",
		clinicalTip:
			"Свобода скидок врача (вплоть до 100% на гарантийные переделки) без мастер-паролей.",
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
		title: "Кассовый чек 54-ФЗ и оплата по QR",
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
			"Переключайтесь между аксиальным, сагиттальным и корональным срезами. Контрастность настраивается в 1 клик пресетом «Кость / Зуб».",
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

// ---------------------------------------------------------------------------
// PROGRESS & STATE MANAGEMENT HELPERS
// ---------------------------------------------------------------------------

export function getDefaultQuestProgress(): QuestProgressState {
	return {
		activeTrackId: "solo_doctor",
		currentStepIndex: 0,
		completedStepIds: [],
		isTourActive: false,
		isDismissedPermanently: false,
		tracksProgress: {
			solo_doctor: { completed: false, completedStepIds: [] },
			reception_admin: { completed: false, completedStepIds: [] },
			imaging_diagnostics: { completed: false, completedStepIds: [] },
		},
	};
}

export function loadQuestProgress(): QuestProgressState {
	if (typeof window === "undefined" || !window.localStorage) {
		return getDefaultQuestProgress();
	}

	try {
		const legacyDismissed = window.localStorage.getItem(DENTE_TOUR_STORAGE_KEY) === "true";
		const raw = window.localStorage.getItem(DENTE_QUEST_PROGRESS_STORAGE_KEY);
		if (!raw) {
			const initial = getDefaultQuestProgress();
			if (legacyDismissed) {
				return {
					...initial,
					isDismissedPermanently: true,
					isTourActive: false,
					tracksProgress: {
						...initial.tracksProgress,
						solo_doctor: {
							completed: true,
							completedStepIds: SOLO_DOCTOR_TRACK_STEPS.map((s) => s.id),
						},
					},
				};
			}
			return initial;
		}

		const parsed = JSON.parse(raw) as Partial<QuestProgressState>;
		return {
			activeTrackId: parsed.activeTrackId || "solo_doctor",
			currentStepIndex: typeof parsed.currentStepIndex === "number" ? parsed.currentStepIndex : 0,
			completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
			isTourActive: Boolean(parsed.isTourActive),
			isDismissedPermanently: Boolean(parsed.isDismissedPermanently || legacyDismissed),
			tracksProgress: parsed.tracksProgress || {
				solo_doctor: { completed: false, completedStepIds: [] },
				reception_admin: { completed: false, completedStepIds: [] },
				imaging_diagnostics: { completed: false, completedStepIds: [] },
			},
		};
	} catch {
		return getDefaultQuestProgress();
	}
}

export function saveQuestProgress(state: QuestProgressState): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(DENTE_QUEST_PROGRESS_STORAGE_KEY, JSON.stringify(state));
		if (state.isDismissedPermanently || state.tracksProgress.solo_doctor.completed) {
			window.localStorage.setItem(DENTE_TOUR_STORAGE_KEY, "true");
		} else {
			window.localStorage.removeItem(DENTE_TOUR_STORAGE_KEY);
		}
		if (typeof window.dispatchEvent === "function") {
			const evt =
				typeof CustomEvent === "function"
					? new CustomEvent("dente:quest-progress-updated", { detail: state })
					: ({ type: "dente:quest-progress-updated", detail: state } as unknown as Event);
			window.dispatchEvent(evt);
		}
	} catch (e) {
		console.warn("DENTE Quest Tour Engine: failed to persist quest progress", e);
	}
}

export function pauseQuestTour(): QuestProgressState {
	const current = loadQuestProgress();
	const next: QuestProgressState = {
		...current,
		isTourActive: false,
	};
	saveQuestProgress(next);
	return next;
}

export function startQuestTrack(
	trackId: QuestTrackId,
	options: { reset?: boolean } = {},
): QuestProgressState {
	const current = loadQuestProgress();
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	let nextStepIndex = 0;
	if (!options.reset) {
		const trackProgress = current.tracksProgress[trackId];
		if (trackProgress && !trackProgress.completed && trackProgress.completedStepIds.length > 0) {
			const firstUncompleted = track.steps.findIndex(
				(s) => !trackProgress.completedStepIds.includes(s.id),
			);
			nextStepIndex =
				firstUncompleted >= 0
					? firstUncompleted
					: Math.min(current.currentStepIndex, track.steps.length - 1);
		} else if (current.activeTrackId === trackId && current.currentStepIndex > 0) {
			nextStepIndex = Math.min(current.currentStepIndex, track.steps.length - 1);
		}
	}

	const next: QuestProgressState = {
		...current,
		activeTrackId: trackId,
		currentStepIndex: nextStepIndex,
		isTourActive: true,
		isDismissedPermanently: false,
	};
	saveQuestProgress(next);
	return next;
}

export function advanceQuestStep(currentProgress: QuestProgressState): QuestProgressState {
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === currentProgress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const step = track.steps[currentProgress.currentStepIndex];
	const stepId = step ? step.id : "";

	const currentCompletedSteps = Array.from(
		new Set([...currentProgress.completedStepIds, ...(stepId ? [stepId] : [])]),
	);

	const isLastStep = currentProgress.currentStepIndex >= track.steps.length - 1;
	const nextIndex = isLastStep ? currentProgress.currentStepIndex : currentProgress.currentStepIndex + 1;

	const trackCompleted = isLastStep;
	const existingTrackProgress = currentProgress.tracksProgress[track.id] || {
		completed: false,
		completedStepIds: [],
	};

	const updatedTrackProgress: QuestTrackProgress = {
		completed: trackCompleted || existingTrackProgress.completed,
		completedStepIds: Array.from(
			new Set([...existingTrackProgress.completedStepIds, ...(stepId ? [stepId] : [])]),
		),
	};

	const nextState: QuestProgressState = {
		...currentProgress,
		completedStepIds: currentCompletedSteps,
		currentStepIndex: nextIndex,
		isTourActive: !isLastStep,
		tracksProgress: {
			...currentProgress.tracksProgress,
			[track.id]: updatedTrackProgress,
		},
	};

	saveQuestProgress(nextState);
	return nextState;
}

export function skipQuestStep(currentProgress: QuestProgressState): QuestProgressState {
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === currentProgress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const isLastStep = currentProgress.currentStepIndex >= track.steps.length - 1;
	const nextIndex = isLastStep ? currentProgress.currentStepIndex : currentProgress.currentStepIndex + 1;

	const nextState: QuestProgressState = {
		...currentProgress,
		currentStepIndex: nextIndex,
		isTourActive: !isLastStep,
	};

	saveQuestProgress(nextState);
	return nextState;
}

export function dismissQuestTourPermanently(): QuestProgressState {
	const current = loadQuestProgress();
	const next: QuestProgressState = {
		...current,
		isTourActive: false,
		isDismissedPermanently: true,
	};
	saveQuestProgress(next);
	return next;
}

export function getNextTrackId(currentTrackId: QuestTrackId): QuestTrackId | null {
	const currentIndex = CLINICAL_QUEST_TRACKS.findIndex((t) => t.id === currentTrackId);
	if (currentIndex >= 0 && currentIndex < CLINICAL_QUEST_TRACKS.length - 1) {
		return CLINICAL_QUEST_TRACKS[currentIndex + 1]!.id;
	}
	return null;
}

export function resetQuestProgress(trackId?: QuestTrackId): QuestProgressState {
	const current = loadQuestProgress();
	if (trackId) {
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const trackStepIds = new Set(track ? track.steps.map((s) => s.id) : []);
		const filteredCompletedStepIds = current.completedStepIds.filter((id) => !trackStepIds.has(id));

		const next: QuestProgressState = {
			...current,
			isTourActive: current.activeTrackId === trackId ? true : current.isTourActive,
			currentStepIndex: current.activeTrackId === trackId ? 0 : current.currentStepIndex,
			completedStepIds: filteredCompletedStepIds,
			tracksProgress: {
				...current.tracksProgress,
				[trackId]: { completed: false, completedStepIds: [] },
			},
		};
		saveQuestProgress(next);
		return next;
	}

	const next = getDefaultQuestProgress();
	saveQuestProgress(next);
	return next;
}

export function isActionTriggerSatisfied(
	trigger: QuestActionTrigger,
	event: {
		type: string;
		key?: string;
		ctrlKey?: boolean;
		metaKey?: boolean;
		shiftKey?: boolean;
		eventName?: string;
	},
): boolean {
	if (trigger.type === "click" && event.type === "click") {
		return true;
	}

	if (trigger.type === "keyboard" && event.type === "keydown") {
		if (trigger.key) {
			const expectedKey = trigger.key.toLowerCase();
			const actualKey = (event.key || "").toLowerCase();
			if (expectedKey !== actualKey) return false;
		}

		if (typeof trigger.shiftKey === "boolean" && Boolean(event.shiftKey) !== trigger.shiftKey) {
			return false;
		}

		if (typeof trigger.ctrlKey === "boolean") {
			const actualCtrlOrCmd = Boolean(event.ctrlKey || event.metaKey);
			if (actualCtrlOrCmd !== trigger.ctrlKey) return false;
		}

		return true;
	}

	if (trigger.type === "custom_event" && event.type === "custom_event") {
		return !trigger.eventName || trigger.eventName === event.eventName;
	}

	return false;
}

export function dispatchQuestActionCompleted(stepId: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente:quest-action-completed", {
			detail: { stepId },
		}),
	);
}
