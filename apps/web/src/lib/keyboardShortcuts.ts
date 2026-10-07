/**
 * DENTE CRM — Clinical Keyboard Shortcuts Registry & Event Dispatcher
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 *
 * Essential Speed Keys:
 * - F1 / Ctrl+K / Cmd+K: Fast patient search & command palette
 * - Space / Enter: Start / complete visit at chairside
 * - Ctrl+S / Cmd+S: Save visit protocol to local draft & DB (with preventDefault)
 * - Esc: Close drawers, search bar, and modal overlays
 * - 1..8: Tooth quadrant / FDI group selector in Odontogram
 * - Shift+N: 1-click physiological norm auto-fill (Odontogram / Somatic status)
 * - C, P, K, X: Rapid clinical surface/tooth classification (Caries, Pulpitis, Crown, Extracted)
 * - F9: Fast fiscal checkout tender (54-FZ)
 * - F7: Chairside RVG Visiograph / CT capture
 * - F12: Quick print Form 043/u diary
 * - Alt+1..5: Fast operatory workspace navigation
 * - ?: Toggle shortcuts overlay modal
 */

export type ShortcutCategory =
	| "global"
	| "navigation"
	| "visit"
	| "odontogram"
	| "cashier"
	| "imaging"
	| "sanpin";

export interface ClinicalShortcutItem {
	id: string;
	title: string;
	keyCombination: string;
	keys: string[];
	description: string;
	category: ShortcutCategory;
	context?: string;
	badge?: string;
	actionEvent?: string;
}

export const CLINICAL_SHORTCUTS: readonly ClinicalShortcutItem[] = [
	// 1. Global & Navigation
	{
		id: "global-search",
		title: "Глобальный поиск пациентов и команд",
		keyCombination: "Ctrl+K / F1",
		keys: ["Ctrl", "K"],
		description: "Быстрый поиск пациента по ФИО/телефону или переход в нужный раздел CRM.",
		category: "global",
		context: "Везде",
		badge: "Быстрый старт",
		actionEvent: "dente:open-omnibar",
	},
	{
		id: "help-knowledge-hub",
		title: "База знаний и интерактивное обучение (Справка)",
		keyCombination: "F1",
		keys: ["F1"],
		description: "Открыть Базу знаний DENTE, иллюстрированные руководства по 12 компонентам и квест врача.",
		category: "global",
		context: "Везде",
		badge: "Справка",
		actionEvent: "dente:open-knowledge-hub",
	},
	{
		id: "shortcuts-overlay",
		title: "Шпаргалка горячих клавиш",
		keyCombination: "?",
		keys: ["?"],
		description: "Открыть экран подсказок по всем скоростным клавишам врача и регистратуры.",
		category: "global",
		context: "Везде",
		badge: "Справка",
		actionEvent: "dente:open-shortcuts-overlay",
	},
	{
		id: "close-overlay",
		title: "Закрыть шторку / модальное окно",
		keyCombination: "Esc",
		keys: ["Esc"],
		description: "Закрыть активную шторку контекста, окно поиска, оверлей или снять выделение.",
		category: "global",
		context: "Везде",
		actionEvent: "dente:close-modals",
	},
	{
		id: "nav-workspace-tabs",
		title: "Быстрое переключение вкладок",
		keyCombination: "Alt+1..5",
		keys: ["Alt", "1..5"],
		description: "1: Расписание, 2: Прием, 3: Пациенты, 4: Документы, 5: Финансы.",
		category: "navigation",
		context: "Десктоп",
		badge: "0 кликов",
	},
	{
		id: "refresh-schedule",
		title: "Обновить расписание без перезагрузки",
		keyCombination: "F5",
		keys: ["F5"],
		description: "Синхронизация слотов приема без потери набранных врачом черновиков.",
		category: "navigation",
		context: "Расписание",
		actionEvent: "dente:refresh-schedule",
	},

	// 2. Visit & Clinical Protocol (Medical Card)
	{
		id: "save-visit-protocol",
		title: "Сохранить протокол визита (Autosave & DB)",
		keyCombination: "Ctrl+S",
		keys: ["Ctrl", "S"],
		description: "Молниеносная запись протокола в медицинскую карту и базу без потери данных.",
		category: "visit",
		context: "Прием / Карта",
		badge: "Защита данных",
		actionEvent: "dente:shortcut:save",
	},
	{
		id: "start-complete-visit",
		title: "Начать / Завершить визит",
		keyCombination: "Space / Enter",
		keys: ["Space"],
		description: "Перевести статус записи в «Пациент в кресле» или завершить прием.",
		category: "visit",
		context: "Расписание / Прием",
		badge: "Кресло",
		actionEvent: "dente:toggle-visit-status",
	},
	{
		id: "submit-modal",
		title: "Подтвердить действие в форме",
		keyCombination: "Ctrl+Enter",
		keys: ["Ctrl", "Enter"],
		description: "Быстрое утверждение введенных данных или подписание протокола без мыши.",
		category: "visit",
		context: "Формы и дневники",
	},
	{
		id: "print-043-diary",
		title: "Быстрая печать медицинской карты",
		keyCombination: "F12 / Ctrl+P",
		keys: ["F12"],
		description: "Печать выписки первичного приёма или дневниковой записи со штампом врача.",
		category: "visit",
		context: "Прием / Документы",
		actionEvent: "dente:print-043-diary",
	},

	// 3. Odontogram & Tooth Formula
	{
		id: "odontogram-quadrants",
		title: "Выбор квадранта / группы зубов",
		keyCombination: "1..8",
		keys: ["1..8"],
		description: "Цифры 1..4 для взрослых квадрантов (11-48) и 5..8 для молочных (51-85).",
		category: "odontogram",
		context: "Зубная формула",
		badge: "2 клика",
	},
	{
		id: "odontogram-autonorm",
		title: "Формула интактна / физиологическая норма",
		keyCombination: "Shift+N",
		keys: ["Shift", "N"],
		description: "Заполнение зубной формулы нормой без ручного прокликивания 32 зубов.",
		category: "odontogram",
		context: "Зубная формула",
		badge: "Автонорма",
		actionEvent: "dente:odontogram:autonorm",
	},
	{
		id: "odontogram-caries",
		title: "Отметить кариес (Caries)",
		keyCombination: "C",
		keys: ["C"],
		description: "Назначить выбранной поверхности зуба статус кариозного поражения (МКБ К02).",
		category: "odontogram",
		context: "Выбранный зуб",
	},
	{
		id: "odontogram-pulpitis",
		title: "Отметить пульпит / периодонтит",
		keyCombination: "P",
		keys: ["P"],
		description: "Фиксация пульпита или эндодонтического лечения каналов (МКБ К04).",
		category: "odontogram",
		context: "Выбранный зуб",
	},
	{
		id: "odontogram-crown",
		title: "Искусственная коронка / мост",
		keyCombination: "K",
		keys: ["K"],
		description: "Маркировка зуба под коронку или опору ортопедической конструкции.",
		category: "odontogram",
		context: "Выбранный зуб",
	},
	{
		id: "odontogram-missing",
		title: "Отсутствующий / удаленный зуб",
		keyCombination: "X",
		keys: ["X"],
		description: "Пометить зуб как отсутствующий (дефект зубного ряда).",
		category: "odontogram",
		context: "Выбранный зуб",
	},

	// 4. Cashier & Payment
	{
		id: "fast-checkout",
		title: "Касса и оплата чека",
		keyCombination: "F9",
		keys: ["F9"],
		description: "Мгновенный переход к кассе, фискализации чека или СБП оплате визита.",
		category: "cashier",
		context: "Касса / Прием",
		badge: "Чек",
		actionEvent: "dente:open-checkout",
	},
	{
		id: "cashier-split-tender",
		title: "Комбинированная оплата (Сплит в 3 клика)",
		keyCombination: "Alt+S",
		keys: ["Alt", "S"],
		description: "Разделение счета на наличные, карту терминала и семейный аванс без лишних реквизитов.",
		category: "cashier",
		context: "Окно оплаты",
		badge: "Сплит",
	},

	// 5. Imaging & Radiology
	{
		id: "open-visiograph",
		title: "Захват снимка визиографа / КТ",
		keyCombination: "F7",
		keys: ["F7"],
		description: "Молниеносный захват кадра с RVG-датчика или открытие DICOM томограммы.",
		category: "imaging",
		context: "Снимки / КТ",
		badge: "<50 мс",
		actionEvent: "dente:open-visiograph",
	},
	{
		id: "imaging-calibrate",
		title: "Линейка калибровки кости (имплантация)",
		keyCombination: "M",
		keys: ["M"],
		description: "Измерение высоты и ширины альвеолярного гребня в миллиметрах.",
		category: "imaging",
		context: "Просмотрщик КТ",
	},
];

/**
 * Checks whether the active element in DOM is a form input, textarea, or contenteditable.
 */
export function isTypingInInputElement(target: EventTarget | null): boolean {
	if (!target) return false;
	const el = target as { tagName?: string; isContentEditable?: boolean; type?: string };
	if (!el.tagName) return false;

	const tagName = el.tagName.toUpperCase();
	if (tagName === "TEXTAREA") return true;
	if (el.isContentEditable) return true;

	if (tagName === "INPUT") {
		const inputType = (el.type || "").toLowerCase();
		const nonTextTypes = ["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"];
		return !nonTextTypes.includes(inputType);
	}

	return false;
}

/**
 * Matches an incoming KeyboardEvent against a shortcut string specification.
 * Supports cross-layout Cyrillic mappings.
 */
export function matchesKeyboardShortcut(e: KeyboardEvent, shortcutSpec: string): boolean {
	const isCtrlOrMeta = e.ctrlKey || e.metaKey;
	const key = (e.key || "").toLowerCase();
	const code = e.code || "";

	switch (shortcutSpec.toLowerCase()) {
		case "f1":
			return e.key === "F1" || code === "F1";
		case "ctrl+k":
		case "cmd+k":
			return isCtrlOrMeta && (key === "k" || key === "л" || code === "KeyK") && !e.altKey;
		case "ctrl+s":
		case "cmd+s":
			return isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !e.altKey;
		case "ctrl+enter":
		case "cmd+enter":
			return isCtrlOrMeta && (e.key === "Enter" || code === "Enter");
		case "escape":
		case "esc":
			return e.key === "Escape" || code === "Escape";
		case "?":
		case "shift+?":
			return (
				e.key === "?" ||
				(e.shiftKey &&
					(e.key === "/" ||
						e.key === "," ||
						e.key === "7" ||
						code === "Slash" ||
						code === "Digit7"))
			);
		case "space":
			return e.key === " " || code === "Space";
		case "enter":
			return e.key === "Enter" || code === "Enter";
		case "shift+n":
			return e.shiftKey && (key === "n" || key === "т" || code === "KeyN");
		case "f5":
			return (e.key === "F5" || code === "F5") && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
		case "f7":
			return e.key === "F7" || code === "F7";
		case "f9":
			return e.key === "F9" || code === "F9";
		case "f12":
			return e.key === "F12" || code === "F12";
		case "c":
			return !isCtrlOrMeta && !e.altKey && (key === "c" || key === "с" || code === "KeyC");
		case "p":
			return !isCtrlOrMeta && !e.altKey && (key === "p" || key === "з" || code === "KeyP");
		case "k":
			return !isCtrlOrMeta && !e.altKey && (key === "k" || key === "л" || code === "KeyK");
		case "x":
			return !isCtrlOrMeta && !e.altKey && (key === "x" || key === "ч" || code === "KeyX");
		default:
			return false;
	}
}

/**
 * Filter clinical shortcuts by category.
 */
export function getShortcutsByCategory(category: ShortcutCategory): ClinicalShortcutItem[] {
	return CLINICAL_SHORTCUTS.filter((item) => item.category === category);
}

/**
 * Search clinical shortcuts by title, description, or key combination.
 */
export function searchShortcuts(query: string): ClinicalShortcutItem[] {
	const clean = (query || "").trim().toLowerCase();
	if (!clean) return [...CLINICAL_SHORTCUTS];

	return CLINICAL_SHORTCUTS.filter(
		(item) =>
			item.title.toLowerCase().includes(clean) ||
			item.description.toLowerCase().includes(clean) ||
			item.keyCombination.toLowerCase().includes(clean) ||
			(item.context && item.context.toLowerCase().includes(clean)) ||
			(item.badge && item.badge.toLowerCase().includes(clean)),
	);
}

/**
 * Dispatches a decoupled clinical event across the app.
 */
export function triggerClinicalShortcutEvent(eventName: string): void {
	if (typeof window === "undefined" || !window.dispatchEvent) return;
	try {
		window.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
	} catch {
		// Silent fallback in test environments
	}
}
