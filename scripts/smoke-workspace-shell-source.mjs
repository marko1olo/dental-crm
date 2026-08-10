import { readdirSync, readFileSync } from "node:fs";

/*
 * ПЕРЕВОДЫ СТРОК НОРМАЛИЗУЮТСЯ ПРИ ЧТЕНИИ, И БЕЗ ЭТОГО СТРАЖ — МОНЕТКА.
 *
 * Замерено 29.07.2026. В репозитории `core.autocrlf=true`, и рабочее дерево
 * лежит СМЕШАННЫМ: styles/main.css — 17375 CRLF и ни одного одиночного LF,
 * App.tsx и SettingsView.tsx — наоборот, 5073 и 2017 LF и ни одного CRLF.
 * Любое требование, внутри которого есть литерал `\n`, поэтому проверяет не
 * содержимое файла, а то, в каком виде git его развернул на этой машине.
 *
 * Ровно так падало требование «Sidebar view hints must collapse on mobile»:
 * искалось `.nav-copy small {\n    display: none;`, а правило в файле ЕСТЬ —
 * styles/main.css:13353-13355, внутри медиа-запроса, просто с `\r\n`. Страж
 * сообщал об отсутствии мобильного правила, которое существует.
 *
 * Это не косметика: класс дефекта общий для всех стражей с суффиксом -source,
 * потому что они сравнивают подстроки, а не разбирают код. Здесь он закрыт в
 * одном месте — чтением через normalizeSource.
 */
function readSource(relativePath) {
	return readFileSync(relativePath, "utf8").replace(/\r\n/g, "\n");
}

/*
 * КОММЕНТАРИЙ НЕ ВЫПОЛНЯЕТ ТРЕБОВАНИЕ К КОДУ.
 *
 * ДОКАЗАНО МУТАЦИЕЙ 2026-08-10. В App.tsx:167, первой строкой тела `App()`,
 * лежал комментарий, содержащий ДОСЛОВНЫЙ текст сообщения этого стража и оба
 * его искомых куска:
 *
 *   // Topbar dictation shortcut must open the visit dictation area:
 *   // goToVisitDictation, scrollToVisitArea(".dictation-box")
 *
 * Удаление ОДНОГО этого комментария при полностью целом продукте поднимало
 * число падений с 15 до 16, и новое падение — ровно «Topbar dictation shortcut
 * must open the visit dictation area». То есть требование охраняло комментарий,
 * а не поведение. Сама способность жива и смонтирована, но в другом месте:
 * useAppLogic.tsx:1862 (`scrollToVisitArea(".dictation-box")` внутри
 * `goToVisitDictation`) и VisitView.tsx:739 (кнопка «Диктовка»).
 *
 * Рядом, App.tsx:1-3, лежит блок с заголовком «Static test compliance matches:»
 * той же природы. Комментарий, написанный, чтобы кормить проверку, — это
 * подделка зелёного цвета: продукт можно сломать, не тронув комментарий, и
 * страж промолчит.
 *
 * Поэтому весь текст проходит вырезку комментариев ПЕРЕД сравнением. Строки и
 * шаблоны сохраняются: требования вида '"documents"' и `className="…"` обязаны
 * продолжать работать. Длина текста сохраняется тоже — иначе поехали бы
 * смещения в требованиях, которые считают позиции.
 */
function codeOnly(source) {
	let out = "";
	let i = 0;
	const n = source.length;
	while (i < n) {
		const c = source[i];
		const next = source[i + 1];
		if (c === "/" && next === "/") {
			while (i < n && source[i] !== "\n") {
				out += " ";
				i += 1;
			}
			continue;
		}
		if (c === "/" && next === "*") {
			while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
				out += source[i] === "\n" ? "\n" : " ";
				i += 1;
			}
			out += "  ";
			i += 2;
			continue;
		}
		if (c === '"' || c === "'" || c === "`") {
			const quote = c;
			out += c;
			i += 1;
			while (i < n) {
				if (source[i] === "\\") {
					out += source[i] + (source[i + 1] ?? "");
					i += 2;
					continue;
				}
				out += source[i];
				if (source[i] === quote) {
					i += 1;
					break;
				}
				i += 1;
			}
			continue;
		}
		out += c;
		i += 1;
	}
	return out;
}

/** Исходник без комментариев: требования к коду сверяются только с кодом. */
function readCode(relativePath) {
	return codeOnly(readSource(relativePath));
}

const appSource = readCode("apps/web/src/App.tsx");
const financeViewSource = readSource("apps/web/src/FinanceView.tsx");
const scheduleViewSource = readSource("apps/web/src/ScheduleView.tsx");
const settingsViewSource = readSource("apps/web/src/SettingsView.tsx");
const shellSource = readSource("apps/web/src/workspaceShell.tsx");
const continuityStripSource = readSource(
	"apps/web/src/workspaceContinuityStrip.tsx",
);
const routeErrorBoundarySource = readSource(
	"apps/web/src/workspaceRouteErrorBoundary.tsx",
);
const preloadSource = readSource("apps/web/src/workspacePreload.ts");
const cssSource = readSource("apps/web/src/styles/main.css");
const motionPreferenceSource = readSource("apps/web/src/motionPreference.ts");
const workspaceUiLabelsSource = readSource("apps/web/src/workspaceUiLabels.ts");

const missing = [];

function requireIn(source, snippet, message) {
	if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
	if (source.includes(snippet)) missing.push(message);
}

requireIn(
	appSource,
	'from "./workspaceShell"',
	"App.tsx must import workspace shell boundaries",
);
requireIn(
	appSource,
	'from "./workspacePreload"',
	"App.tsx must import route preloading from the dedicated helper chunk",
);
// WorkspaceSidebar must receive currentView and onViewIntent (role prop is allowed)
requireIn(
	appSource,
	"<WorkspaceSidebar currentView={currentView}",
	"App.tsx must delegate sidebar rendering and route preloading",
);
requireIn(
	appSource,
	"onViewIntent={preloadWorkspaceView}",
	"App.tsx must wire preload intent into the sidebar",
);
requireIn(
	appSource,
	"<WorkspaceTopbar",
	"App.tsx must delegate topbar rendering",
);
requireIn(
	preloadSource,
	"const workspaceViewPreloaders",
	"Workspace preload helper must own lazy route preload mapping next to route imports",
);
requireIn(
	preloadSource,
	'export type WorkspacePreloadIntent = "explicit" | "idle"',
	"Workspace preload helper must distinguish user-intent and idle route preloading",
);
requireIn(
	preloadSource,
	"type NetworkAwareNavigator",
	"Workspace preload helper must read browser network hints without unsafe navigator.connection access",
);
requireIn(
	preloadSource,
	"connection.saveData",
	"Workspace preload helper must respect Save-Data before route preloading",
);
requireIn(
	preloadSource,
	'intent === "idle" && (effectiveType === "slow-2g" || effectiveType === "2g")',
	"Workspace preload helper must avoid idle route preloading on very slow links",
);
requireIn(
	preloadSource,
	'export function preloadWorkspaceView(view: AppView, intent: WorkspacePreloadIntent = "explicit")',
	"Workspace preload helper must expose one network-aware route preload callback to shell chrome",
);
requireIn(
	preloadSource,
	"const idleWorkspacePreloadPlan",
	"Workspace preload helper must preload likely next lazy routes during browser idle time",
);
requireIn(
	preloadSource,
	"requestIdleCallback",
	"Workspace preload helper must use idle time for speculative route preloading",
);
requireIn(
	preloadSource,
	"window.setTimeout(preloadLikelyRoutes, 1200)",
	"Workspace preload helper must keep a timer fallback for browsers without requestIdleCallback",
);
requireIn(
	preloadSource,
	'preloadViews.forEach((view) => preloadWorkspaceView(view, "idle"))',
	"Workspace preload helper must mark speculative idle route preloads separately from user intent",
);
requireIn(
	preloadSource,
	'schedule: () => import("./ScheduleView")',
	"Workspace preload helper must preload ScheduleView on navigation intent",
);
requireIn(
	preloadSource,
	'patients: () => import("./PatientsView")',
	"Workspace preload helper must preload PatientsView on navigation intent",
);
requireIn(
	preloadSource,
	'documents: () => import("./DocumentsView")',
	"Workspace preload helper must preload DocumentsView on navigation intent",
);
requireIn(
	preloadSource,
	'finance: () => import("./FinanceView")',
	"Workspace preload helper must preload FinanceView on navigation intent",
);
requireIn(
	preloadSource,
	'communications: () => import("./CommunicationsView")',
	"Workspace preload helper must preload CommunicationsView on navigation intent",
);
requireIn(
	preloadSource,
	'settings: () => import("./SettingsView")',
	"Workspace preload helper must preload SettingsView on navigation intent",
);
requireIn(
	appSource,
	"useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);",
	"App.tsx must delegate idle route preloading to the helper chunk",
);
requireIn(
	appSource,
	'from "./workspaceRouteErrorBoundary"',
	"App.tsx must import the shared route error boundary outside the heavy route bodies",
);
requireIn(
	routeErrorBoundarySource,
	"class WorkspaceRouteErrorBoundary",
	"App.tsx must isolate lazy route failures from the whole workspace",
);
requireIn(
	routeErrorBoundarySource,
	"workspaceRouteErrorDetail",
	"Route error boundary must explain lazy route failures with operator-readable copy",
);
requireIn(
	routeErrorBoundarySource,
	"componentDidCatch(error: unknown, errorInfo: ErrorInfo)",
	"Workspace route error boundary must catch route runtime failures",
);
requireIn(
	routeErrorBoundarySource,
	"window.location.reload()",
	"Workspace route error boundary must offer deterministic recovery",
);
requireIn(
	routeErrorBoundarySource,
	"Раздел временно не открылся. Уже введенные данные не менялись.",
	"Workspace route error state must avoid raw chunk/error jargon",
);
for (const view of [
	"schedule",
	"patients",
	"documents",
	"finance",
	"communications",
	"settings",
]) {
	requireIn(
		appSource,
		`<WorkspaceRouteErrorBoundary view="${view}"`,
		`Lazy ${view} route must be wrapped in a route error boundary`,
	);
}
requireIn(
	continuityStripSource,
	"visible = !isOnline || pendingVisitSaveCount > 0 || pendingSpeechChunkCount > 0 || browserContinuityCritical",
	"Workspace must show a persistent continuity strip for offline mode, queued visit saves, queued audio, and local-storage risks",
);
requireIn(
	appSource,
	"<WorkspaceContinuityStrip",
	"App.tsx must mount the shared continuity strip outside individual routes",
);
requireIn(
	continuityStripSource,
	'className={`workspace-continuity-strip ${!isOnline ? "offline" : "queued"}`}',
	"Workspace continuity strip must expose stable offline/queued states",
);
requireIn(
	continuityStripSource,
	"Можно продолжать прием: черновики и аудио остаются на этом устройстве",
	"Workspace offline strip must explain that clinical work can continue",
);
requireIn(
	continuityStripSource,
	"Отправить приемы",
	"Workspace continuity strip must offer queued visit sync without hunting inside the visit screen",
);
requireIn(
	continuityStripSource,
	"Отправить аудио",
	"Workspace continuity strip must offer queued audio sync without hunting inside the visit screen",
);
requireIn(
	continuityStripSource,
	"Проверить это устройство",
	"Workspace continuity strip must offer a device continuity check",
);
requireIn(
	continuityStripSource,
	"aria-describedby={!isOnline ? workspaceContinuityOfflineGuidanceId : undefined}",
	"Disabled continuity sync actions must point to offline guidance",
);
requireIn(
	appSource,
	"onViewIntent={preloadWorkspaceView}",
	"App.tsx must wire preload intent into shell chrome",
);
requireIn(
	appSource,
	'className="skip-link"',
	"App.tsx must expose a keyboard skip link before the sidebar",
);
requireIn(
	appSource,
	'href="#workspace-content"',
	"Keyboard skip link must target the workspace content region",
);
requireIn(
	appSource,
	'id="workspace-content"',
	"Workspace region must be addressable by the skip link",
);
requireIn(
	appSource,
	"tabIndex={-1}",
	"Workspace region must be programmatically focusable for skip-link navigation",
);
requireIn(
	appSource,
	'aria-label="Рабочая область"',
	"Workspace region must expose a readable landmark label",
);
forbidIn(
	appSource,
	'className="sidebar"',
	"App.tsx must not inline sidebar markup",
);
forbidIn(
	appSource,
	'className="topbar"',
	"App.tsx must not inline topbar markup",
);
forbidIn(
	appSource,
	"function ActionIcon",
	"App.tsx must not own the navigation action icon component",
);
forbidIn(
	appSource,
	"const workspaceViewPreloaders",
	"App.tsx must not inline route preload mapping in the workspace chunk",
);
forbidIn(
	appSource,
	"function shouldPreloadWorkspaceRoutes",
	"App.tsx must not inline network-aware preload policy in the workspace chunk",
);
forbidIn(
	appSource,
	"requestIdleCallback",
	"App.tsx must not inline idle preload scheduling in the workspace chunk",
);

requireIn(
	shellSource,
	"export const appViews",
	"workspaceShell must own app view registry",
);
requireIn(
	shellSource,
	"export const viewLabels",
	"workspaceShell must own app view labels",
);
requireIn(
	shellSource,
	"export const viewHints",
	"workspaceShell must own short operator hints for each app view",
);
requireIn(
	shellSource,
	"type WorkspaceViewIntentHandler = (view: AppView) => void",
	"workspaceShell must type route-intent preloading without owning route modules",
);
requireIn(
	shellSource,
	"export function ActionIcon",
	"workspaceShell must export action icon mapping",
);
requireIn(
	shellSource,
	"export function WorkspaceSidebar",
	"workspaceShell must export sidebar component",
);
requireIn(
	shellSource,
	"export function WorkspaceTopbar",
	"workspaceShell must export topbar component",
);
requireIn(
	shellSource,
	"appViews.map",
	"workspaceShell sidebar must render from the app view registry",
);
requireIn(
	shellSource,
	"href={`#${view}`}",
	"workspaceShell sidebar links must stay hash-routed",
);
requireIn(
	shellSource,
	"onViewIntent?: WorkspaceViewIntentHandler",
	"workspaceShell must accept optional route preload intent callbacks",
);
requireIn(
	shellSource,
	"onPointerEnter={() => onViewIntent?.(view)}",
	"workspaceShell sidebar must preload lazy views on pointer intent",
);
requireIn(
	shellSource,
	"onFocus={() => onViewIntent?.(view)}",
	"workspaceShell sidebar must preload lazy views on keyboard focus",
);
requireIn(
	shellSource,
	"onTouchStart={() => onViewIntent?.(view)}",
	"workspaceShell sidebar must preload lazy views on touch intent",
);
requireIn(
	shellSource,
	'onViewIntent?.("settings")',
	"workspaceShell top settings shortcut must preload SettingsView before navigation",
);
requireIn(
	shellSource,
	'onViewIntent?.("schedule")',
	"workspaceShell top appointment shortcut must preload ScheduleView before navigation",
);
requireIn(
	shellSource,
	'aria-current={currentView === view ? "page" : undefined}',
	"workspaceShell sidebar must announce the active page",
);
requireIn(
	shellSource,
	"aria-label={`${viewLabels[view]}: ${viewHints[view]}`}",
	"workspaceShell sidebar links must explain each section beyond the short label",
);
requireIn(
	shellSource,
	"title={`${viewLabels[view]}: ${viewHints[view]}`}",
	"workspaceShell sidebar links must expose hover hints for low-confidence users",
);
requireIn(
	shellSource,
	'className="nav-copy"',
	"workspaceShell sidebar must render a visible label and desktop hint group",
);
/*
 * СНЯТОЕ ТРЕБОВАНИЕ №1: 'aria-label="Настройки импорта и экспорта"'.
 * Формулировка была «icon-only settings shortcut must have an accessible name».
 *
 * СНЯТО ПОТОМУ, ЧТО ЕГО ПРЯМО ЗАПРЕЩАЕТ ДРУГОЙ ТЕСТ, А НЕ ПОТОМУ, ЧТО КРАСНО.
 * apps/web/src/__tests__/workspaceTopbarActions.test.ts:215-218 утверждает
 * `!shellSource.includes("Настройки импорта и экспорта")` с причиной: ссылка-
 * значок вела на общий хеш `#settings`, который вкладку импорта не открывает, то
 * есть её имя для программы чтения с экрана обещало то, чего она не делала.
 * Разбор удаления лежит в workspaceShell.tsx:721-730: удалён БЕЗЫМЯННЫЙ ДУБЛЬ
 * пункта «Настройки» бокового меню — тот же глиф Database, тот же адрес, — а не
 * путь к настройкам. Все роли, которым он показывался (администратор,
 * управляющий, владелец), имеют подписанный пункт «Настройки» в боковом меню.
 *
 * Два гейта требовали противоположного, поэтому зелёными одновременно быть не
 * могли: этот страж требовал вернуть кнопку, а тест требовал её отсутствия.
 * Правило живёт в том тесте — он разбирает список кнопок и потому строже
 * подстроки.
 * Дублировать запрет здесь не нужно, ссылки достаточно.
 */
requireIn(
	shellSource,
	"onRoleChange(role)",
	"workspaceShell topbar must report role changes through props",
);
requireIn(
	shellSource,
	"aria-pressed={selectedWorkspaceRole === role}",
	"workspaceShell role buttons must expose selected state without relying on color",
);
/*
 * ПОДПИСЬ ВЫНЕСЕНА В МОДУЛЬ ПОДПИСЕЙ — ЭТО ТРЕБОВАНИЕ КОНСТИТУЦИИ, А НЕ РЕГРЕСС.
 *
 * Требовалось дословно `aria-label={`Рабочий режим: ${staffRoleLabels[role]}`}`,
 * то есть ЖЁСТКО ВПИСАННЫЙ русский текст в разметке. В workspaceShell.tsx:567
 * стоит `aria-label={`${workspaceTopbarLabels.role.region}: ${staffRoleLabels[role]}`}`,
 * а сама строка «Рабочий режим» лежит в workspaceUiLabels.ts:393. Результат на
 * экране идентичен, но текст извлечён из разметки — ровно то, что предписывает
 * .agents/AGENTS.md, DESIGN ADAPTABILITY MANDATE, пункт Multi-Language:
 * «Do not hardcode UI text. Extract strings to locale files».
 *
 * Прежнее требование заставляло нарушать конституцию, поэтому проверка разделена
 * на две половины, и обе обязательны: СВЯЗЬ (подпись роли собирается из подписи
 * раздела и названия роли) проверяется в разметке, а ТЕКСТ — там, где он теперь
 * объявлен. Так требование не ослаблено: пропадёт любая из половин — страж
 * упадёт.
 */
requireIn(
	shellSource,
	"aria-label={`${workspaceTopbarLabels.role.region}: ${staffRoleLabels[role]}`}",
	"workspaceShell role buttons must have explicit action names",
);
requireIn(
	workspaceUiLabelsSource,
	'region: "Рабочий режим"',
	"workspaceUiLabels must keep the readable role-region name used by role button labels",
);
requireIn(
	shellSource,
	"onGoToDictation",
	"workspaceShell topbar must keep dictation shortcut externalized",
);
/*
 * СНЯТОЕ ТРЕБОВАНИЕ №2: класс `top-dictation-button`.
 * Формулировка была «topbar must expose a testable dictation shortcut».
 *
 * ЯРЛЫК ДИКТОВКИ НЕ ПРОПАЛ — ПРОПАЛ БЕЗЫМЯННЫЙ ДУБЛЬ, КОТОРЫЙ ЕГО НЁС. Разбор
 * в workspaceShell.tsx:655-666: в строке действий стояли ДВЕ кнопки в один и тот
 * же раздел — подписанная «Прием» и безымянная кнопка-микрофон. Вторая была
 * надмножеством первой, и подписи не имела именно она. Микрофон удалён, а его
 * единственная собственная способность (курсор в поле диктовки) досталась
 * подписанной кнопке: workspaceShell.tsx:676 — `onClick={onGoToDictation}`.
 *
 * Как и требование №1, это запрещено отдельным тестом:
 * __tests__/workspaceTopbarActions.test.ts:207-210 проверяет
 * `!classes.includes("top-dictation-button")` и объясняет, что для
 * администратора, управляющего и ассистента кнопка была МЁРТВОЙ —
 * getFilteredAppViews не содержит `visit`, и охранник маршрута возвращал их на
 * «Смену».
 *
 * Требование заменено на проверку той же способности по её живому носителю:
 * подписанная кнопка обязана быть подключена к onGoToDictation. Ярлык
 * по-прежнему проверяем, но по поведению, а не по классу удалённой кнопки.
 */
requireIn(
	shellSource,
	"onClick={onGoToDictation}",
	"workspaceShell topbar must wire the labelled visit button to the dictation shortcut",
);
requireIn(
	shellSource,
	"onGoToSchedule",
	"workspaceShell topbar must keep schedule shortcut externalized",
);
requireIn(
	shellSource,
	"onGoToVisit",
	"workspaceShell topbar must keep visit shortcut externalized",
);
requireIn(
	appSource,
	"goToVisitDictation",
	"App.tsx must wire the topbar dictation shortcut",
);
/*
 * ТРЕБОВАНИЕ ЦЕЛИТСЯ ТУДА, ГДЕ ПОВЕДЕНИЕ ЖИВЁТ, А НЕ В App.tsx.
 *
 * Искалось `scrollToVisitArea(".dictation-box")` в App.tsx — и находилось
 * ТОЛЬКО в комментарии (см. блок про подделку зелёного в начале файла). В коде
 * App.tsx этого вызова нет и быть не должно: шелл лишь прокидывает обработчик
 * (App.tsx:392 берёт `goToVisitDictation` из логики, App.tsx:2002 передаёт его
 * в топбар как `onGoToDictation`). Сам переход живёт в useAppLogic.tsx:1859-1866.
 *
 * Проверяются обе половины связи, и обе обязательны:
 *   1) логика действительно ведёт к области диктовки;
 *   2) шелл действительно подключает её к кнопке топбара.
 * По отдельности каждая половина проходила бы при разорванной связи: живая
 * функция без подключения — мёртвая кнопка, подключение без функции не
 * скомпилируется. Ровно такой разрыв в этом продукте уже случался — см.
 * __tests__/workspaceTopbarActions.test.ts:216 про «безымянный микрофон».
 */
const appLogicSource = readCode("apps/web/src/useAppLogic.tsx");
requireIn(
	appLogicSource,
	'scrollToVisitArea(".dictation-box")',
	"Topbar dictation shortcut must open the visit dictation area",
);
requireIn(
	appSource,
	"onGoToDictation={goToVisitDictation}",
	"Topbar dictation shortcut must be wired to the visit dictation handler",
);
requireIn(
	cssSource,
	":focus-visible",
	"Global CSS must expose visible keyboard focus",
);
requireIn(
	cssSource,
	".skip-link:focus-visible",
	"Skip link must become visible on keyboard focus",
);
requireIn(
	cssSource,
	".nav-copy small",
	"Sidebar view hints must be styled for desktop discoverability",
);
requireIn(
	cssSource,
	".nav-copy small {\n    display: none;",
	"Sidebar view hints must collapse on mobile to protect bottom navigation",
);
requireIn(
	cssSource,
	".workspace-route-error",
	"Route error panel must have a stable layout class",
);
requireIn(
	cssSource,
	".status-needs_review",
	"Route error status pill must have an explicit warning style",
);
requireIn(
	cssSource,
	"max-width: min(640px, calc(100vw - 40px));",
	"Route error copy must keep a readable measure on mobile and desktop",
);
requireIn(
	cssSource,
	".workspace-continuity-strip",
	"Workspace continuity strip must have a stable layout class",
);
requireIn(
	cssSource,
	".workspace-continuity-strip.offline",
	"Workspace continuity strip must visually distinguish offline mode",
);
requireIn(
	cssSource,
	".workspace-continuity-actions",
	"Workspace continuity actions must stay grouped and responsive",
);
requireIn(
	cssSource,
	"@media (prefers-reduced-motion: reduce)",
	"Global CSS must respect reduced-motion accessibility preferences",
);
requireIn(
	cssSource,
	"scroll-behavior: auto !important",
	"Reduced-motion mode must disable smooth scroll",
);
requireIn(
	cssSource,
	"transition-duration: 0.01ms !important",
	"Reduced-motion mode must suppress transitions",
);
requireIn(
	motionPreferenceSource,
	'window.matchMedia("(prefers-reduced-motion: reduce)")',
	"Programmatic scroll helper must read the reduced-motion preference",
);
requireIn(
	motionPreferenceSource,
	"motionSafeScrollIntoView",
	"Programmatic scroll helper must expose one safe route",
);
requireIn(
	financeViewSource,
	'from "./motionPreference"',
	"FinanceView must use the reduced-motion aware scroll helper",
);
requireIn(
	scheduleViewSource,
	'from "./motionPreference"',
	"ScheduleView must use the reduced-motion aware scroll helper",
);
/*
 * ПРИНУДИТЕЛЬНЫЙ smooth ИЩЕТСЯ ПО ВСЕМУ ДЕРЕВУ, А НЕ В ЧЕТЫРЁХ ФАЙЛАХ.
 *
 * Здесь стояло четыре проверки по именам: App, FinanceView, ScheduleView,
 * SettingsView. Все четыре были зелёными, а нарушение жило в пятом файле —
 * `components/settings/AiRecognitionJobsPanel.tsx:248` форсировал
 * `behavior: "smooth"` в обход motionPreference. Замерено 2026-08-10: это
 * было единственное такое место в apps/web, и гейт его не видел два месяца,
 * потому что перечисление файлов побеждается добавлением файла.
 *
 * Требования «App.tsx и SettingsView обязаны импортировать помощник» сняты
 * как ложные: ни один из этих файлов ничего не прокручивает. App.tsx получает
 * `scrollToVisitArea` из хука (App.tsx:801) — сама прокрутка живёт в
 * `hooks/domains/useVisitLogic.ts:1189` и помощник там используется;
 * SettingsView не содержит ни одного вызова прокрутки. Обязательный, но
 * никем не используемый импорт — мёртвый код, а не доступность.
 *
 * `behavior: "auto"` НЕ нарушение: он не анимирует никогда, поэтому
 * вестибулярного вреда не наносит (так сделан useAppLogic.tsx:2901).
 * Запрещён именно `smooth`, навязанный поверх системного предпочтения.
 */
const SMOOTH_SCROLL_PATTERN =
	/\.(?:scrollIntoView|scrollTo|scrollBy)\(\s*\{[^}]*behavior\s*:\s*["']smooth["']/;
const MOTION_HELPER_FILE = "apps/web/src/motionPreference.ts";

function collectWebSources(dir, out) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === "dist") continue;
		const full = `${dir}/${entry.name}`;
		if (entry.isDirectory()) collectWebSources(full, out);
		else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
			out.push(full);
	}
	return out;
}

const webSources = collectWebSources("apps/web/src", []);
if (webSources.length < 50) {
	console.error(
		`Workspace shell source smoke aborted: обход apps/web/src дал ${webSources.length} файлов — обход сломан, а не дерево пусто.`,
	);
	process.exit(2);
}
for (const file of webSources) {
	if (file === MOTION_HELPER_FILE) continue;
	if (SMOOTH_SCROLL_PATTERN.test(readSource(file)))
		missing.push(
			`${file} must not force smooth scrolling — используй motionSafeScrollIntoView из motionPreference.ts`,
		);
}

if (missing.length > 0) {
	console.error("Workspace shell source smoke failed:");
	for (const item of missing) console.error(`- ${item}`);
	process.exit(1);
}

console.log({
	ok: true,
	sidebarDelegated: true,
	topbarDelegated: true,
	routeErrorRecovery: true,
	workspaceContinuityStrip: true,
	appViewRegistryOwnedByShell: true,
});
