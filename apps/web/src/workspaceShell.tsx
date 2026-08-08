import type { StaffRole } from "@dental/shared";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	CalendarClock,
	CalendarDays,
	ChevronsLeft,
	ClipboardCheck,
	ClipboardList,
	CreditCard,
	Database,
	FileCheck2,
	FileText,
	Image as ImageIcon,
	LayoutDashboard,
	Lock,
	Megaphone,
	MessageSquare,
	Package,
	PackageSearch,
	Plus,
	ReceiptText,
	ScanLine,
	Stethoscope,
	TrendingUp,
	UserPlus,
	Users,
} from "lucide-react";
import { RecentPatientHistoryWidget } from "./components/workspace/RecentPatientHistoryWidget";
import { WorkspaceActionsMount } from "./components/workspaceActions/WorkspaceActions";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import {
	type ClinicMode,
	describeHiddenCapabilities,
	hasCapability,
	staffRoleChoices,
} from "./lib/clinicCapabilities";
import { useSettingsStore } from "./store/settingsStore";
import { type ThemeMode, useThemeStore } from "./store/themeStore";
import {
	type AppView,
	appViews,
	getFallbackAppView,
	getFilteredAppViews,
	viewHints,
	viewLabels,
} from "./utils/routeUtils";
import { clinicModeLabels, workspaceTopbarLabels } from "./workspaceUiLabels";

/*
 * РЕЕСТР РАЗДЕЛОВ — ЕДИНСТВЕННЫЙ СПИСОК, ДЕЛАЮЩИЙ РАЗДЕЛ ДОСТИЖИМЫМ.
 *
 * Раздела нет, пока его нет здесь: AppHelpers.viewFromHash() сверяет первый
 * сегмент хеша именно с этим массивом и на незнакомом значении молча откатывает
 * на «Смену».
 *
 * Отсюда следует обратное правило, и оно стоило трёх готовых разделов. Склад
 * (1487 строк), журнал стерилизации и воронка обращений были дописаны целиком,
 * вместе с рабочими маршрутами сервера, — но в реестре их не было, в цепочке
 * отрисовки App.tsx тоже. Единственным файлом, который их упоминал, был
 * AppRouter.tsx, помеченный в собственной шапке как мёртвый и не импортированный
 * никем; он удалён. Открыть эти разделы не мог никто: ни по меню, ни по адресу.
 *
 * Связка «реестр → ветка в App.tsx → workspacePreload.ts» закрыта тестом
 * tests/panelsAreMounted.test.ts: запись здесь без ветки отрисовки валит сборку.
 */
// Route helpers are re-exported from routeUtils to avoid circular deps
export {
	type AppView,
	appViews,
	getFallbackAppView,
	getFilteredAppViews,
	viewHints,
	viewLabels,
};

type WorkspaceViewIntentHandler = (view: AppView) => void;

/*
 * Раньше это были две цепочки if с общим `return <Sparkles/>` в конце. У «Смены»
 * и «Маркетинга» своей ветки не было вовсе, у «Аналитики» стояла та же искорка —
 * и в боковом меню на позициях 1, 8 и 11 подряд оказывались три одинаковых
 * значка. Подписей рядом нет, значит различить разделы нечем: администратор
 * запоминает не раздел, а номер позиции сверху.
 *
 * Теперь это исчерпывающие Record<AppView, LucideIcon>: ветку нельзя забыть —
 * без неё не собирается проект, а уникальность значков закрыта тестом
 * __tests__/workspaceShellNav.test.ts, чтобы три искорки не вернулись.
 */
export const sidebarIcons: Record<AppView, LucideIcon> = {
	shift: LayoutDashboard,
	schedule: CalendarDays,
	patients: Users,
	imaging: ImageIcon,
	visit: ClipboardList,
	documents: FileText,
	finance: CreditCard,
	analytics: BarChart3,
	communications: MessageSquare,
	inventory: Package,
	scanner: ScanLine,
	leads: UserPlus,
	settings: Database,
	marketing: Megaphone,
};

/*
 * Второй набор — для кнопок действия. Он намеренно отличается от бокового меню:
 * там существительное («Записи» — календарь), здесь глагол («записать» — часы
 * со стрелкой). Это уже было в коде для schedule/visit/documents/finance,
 * поэтому shift/analytics/marketing дополнены в той же логике.
 */
export const actionIcons: Record<AppView, LucideIcon> = {
	shift: LayoutDashboard,
	schedule: CalendarClock,
	patients: Users,
	imaging: ImageIcon,
	visit: ClipboardCheck,
	documents: FileCheck2,
	finance: ReceiptText,
	analytics: TrendingUp,
	communications: MessageSquare,
	inventory: PackageSearch,
	scanner: ScanLine,
	leads: UserPlus,
	settings: Database,
	marketing: Megaphone,
};

function SidebarIcon({ section }: { section: AppView }) {
	const Glyph = sidebarIcons[section];
	return <Glyph aria-hidden="true" />;
}

export function ActionIcon({ section }: { section: AppView }) {
	const Glyph = actionIcons[section];
	return <Glyph aria-hidden="true" />;
}

/**
 * ЧТО ПОКАЗАТЬ В МЕНЮ. Право роли, пересечённое с тем, что осмысленно при этом
 * размере клиники.
 *
 * Отдельный врач получал ту же рельсу из одиннадцати разделов, что и сеть
 * филиалов: режим клиники до этой правки не влиял на меню вообще — оно
 * фильтровалось только по роли. «Маркетинг/SEO» отсюда уходит по той же причине,
 * по которой у отдельного врача уже скрыты рассылки по базе: продвижением
 * занимается тот, у кого есть кому его поручить.
 *
 * Разделы лечения не трогаются: снимки, приём, документы, оплаты нужны врачу
 * ровно так же, как клинике. Прячется организационная обвязка, не клиника.
 *
 * Раздел остаётся доступным по адресу (#marketing) и возвращается в меню при
 * смене режима в настройках: это скрытие, а не удаление.
 */
/**
 * Какие разделы убирает выключенный модуль.
 *
 * ЗАЧЕМ. Признаки модулей до этой правки не влияли на меню вообще: они
 * фильтровали только вкладки настроек. Владелец выключал «Склад», видел
 * «Сохранено» — и раздел оставался на месте. Переключатель, который ничего не
 * переключает, хуже отсутствующего.
 *
 * Сопоставление намеренно узкое: убираем только те разделы, у которых признак
 * означает ровно «этого модуля у клиники нет». Разделы лечения — смена,
 * расписание, пациенты, снимки, приём, документы — не трогаются никаким
 * признаком: это и есть клиника.
 *
 * Признак читается только если он ЯВНО false. Пока набор не загрузился с
 * сервера, отнимать разделы нельзя — по той же причине, по которой этого не
 * делает неизвестный режим клиники.
 */
export function viewsHiddenByFeatureFlags(flags: {
	hasInventoryModule?: boolean;
	hasAnalyticsModule?: boolean;
	hasPayrollModule?: boolean;
	hasMarketingModule?: boolean;
}): AppView[] {
	const hidden: AppView[] = [];
	if (flags?.hasInventoryModule === false) hidden.push("inventory");
	if (flags?.hasAnalyticsModule === false) hidden.push("analytics");
	if (flags?.hasMarketingModule === false) hidden.push("marketing");
	return hidden;
}

export function getVisibleRailViews(
	role: StaffRole,
	mode: ClinicMode | null,
): AppView[] {
	const allowedByRole = getFilteredAppViews(role);
	if (hasCapability(mode, "marketingSection")) return allowedByRole;
	/*
	 * «Обращения» уходят вместе с «Маркетингом» и по той же причине: воронка
	 * заявок до записи — это работа привлечения. У отдельного врача обращение
	 * приходит звонком и в ту же минуту становится записью; наполнять канбан из
	 * пяти столбцов ему нечем, а пустая доска на рельсе — это лишний раздел.
	 *
	 * Своей возможности воронка намеренно не получает: правило то же самое, а два
	 * имени для одного правила разъезжаются при первой же правке одного из них.
	 * Раздел остаётся достижимым по адресу #leads и возвращается в меню при смене
	 * режима в настройках — это скрытие, а не удаление.
	 */
	return allowedByRole.filter(
		(view) => view !== "marketing" && view !== "leads",
	);
}

/**
 * Какие разделы у этой роли убрал именно режим клиники.
 *
 * ЗАЧЕМ. Раздел, исчезнувший без объяснения, читается как поломка: человек помнит,
 * что «Обращения» были, и ищет их в свёрнутом меню, в поиске, в настройках. Чтобы
 * сказать ему словами, что именно скрыто и как вернуть, нужен точный список, а не
 * общая фраза.
 *
 * Список ВЫЧИСЛЯЕТСЯ разностью двух функций выше, а не выписывается третьим
 * перечислением. Иначе следующее правило скрытия попало бы в одну из них и не
 * попало во вторую: подпись обещала бы одно, меню показывало другое.
 */
export function getRailViewsHiddenByMode(
	role: StaffRole,
	mode: ClinicMode | null,
): AppView[] {
	const visible = getVisibleRailViews(role, mode);
	return getFilteredAppViews(role).filter((view) => !visible.includes(view));
}

export function WorkspaceSidebar({
	currentView,
	onViewIntent,
	role,
	collapsed,
	onToggleCollapsed,
}: {
	currentView: AppView;
	onViewIntent?: WorkspaceViewIntentHandler;
	role: StaffRole;
	collapsed: boolean;
	onToggleCollapsed: () => void;
}) {
	/*
	 * Режим читается из того же ответа сервера, по которому решают рассылки
	 * (CommunicationsView) и отчёты руководителю (ManagerReportsPanel), — второго
	 * источника правды не заводим. Вне провайдера контекст возвращает пустой
	 * объект, режим оказывается null, и меню показывается целиком: пока режим не
	 * известен, отнимать разделы нельзя.
	 */
	const clinicMode = useSettingsStore((s) => s.clinicMode);
	/*
	 * ВЫКЛЮЧЕННЫЙ МОДУЛЬ УБИРАЕТ РАЗДЕЛ ИЗ МЕНЮ.
	 *
	 * Раньше меню фильтровалось только по роли и размеру клиники, а признаки
	 * модулей на него не влияли вообще. Владелец выключал «Склад» на вкладке
	 * «Модули», видел «Сохранено» — и «Склад» оставался в меню. То есть
	 * переключатели модулей ничего не переключали, а вся модульность держалась на
	 * фильтрах вкладок настроек.
	 *
	 * Признаки берутся из того же хранилища, что и вкладки настроек
	 * (useWorkspaceProfile) — второго источника правды не заводим. С сервера они
	 * приходить начали только с миграции 0139: до неё GET отдавал константу со
	 * всеми модулями включёнными, а POST не сохранял ничего.
	 *
	 * Скрытие, а не удаление: раздел остаётся достижимым по адресу и возвращается в
	 * меню, как только модуль включат обратно.
	 */
	const featureFlags = useWorkspaceProfile();
	const hiddenByModules = viewsHiddenByFeatureFlags(featureFlags);
	const allowedViews = getVisibleRailViews(role, clinicMode).filter(
		(view) => !hiddenByModules.includes(view),
	);

	/*
	 * ПОЧЕМУ РАЗДЕЛОВ МЕНЬШЕ, ЧЕМ БЫЛО.
	 *
	 * Режим убирает разделы молча, и это отдельный дефект: подпись про скрытое
	 * (`describeHiddenCapabilities`) в проекте была, но её не вызывал никто —
	 * функция, весь смысл которой объяснить пропажу, лежала мёртвой. Человек видел
	 * меню на два пункта короче и не имел ни слова о причине, ни пути назад.
	 *
	 * Строка появляется только когда режим действительно что-то убрал у ЭТОЙ роли:
	 * у врача «Маркетинга» и «Обращений» нет и при режиме сети, значит и объяснять
	 * ему нечего. У свёрнутого меню ширины под текст нет — там строки тоже нет,
	 * подпись вернётся при разворачивании.
	 *
	 * Скрытое перечисляется по названиям разделов, которые человек только что
	 * потерял из вида. Остальное, что упрощает режим (рассылки по базе, разрез
	 * отчётов по врачам, занятость кресел), лежит внутри других разделов и в
	 * рельсе не видно — оно уходит в подсказку и в текст для программы чтения с
	 * экрана, чтобы короткая строка не превратилась в абзац.
	 */
	const hiddenByMode = getRailViewsHiddenByMode(role, clinicMode);
	const modeTitle = clinicMode ? clinicModeLabels[clinicMode].title : null;
	const hiddenSectionNames = hiddenByMode
		.map((view) => viewLabels[view])
		.join(", ");
	const hiddenCapabilityNames =
		describeHiddenCapabilities(clinicMode).join(", ");
	const modeExplanation =
		modeTitle && hiddenByMode.length > 0
			? `Режим «${modeTitle}» не показывает разделы: ${hiddenSectionNames}.${
					hiddenCapabilityNames
						? ` Также упрощены: ${hiddenCapabilityNames}.`
						: ""
				} Разделы не удалены — они вернутся, если сменить режим в настройках клиники.`
			: null;

	/*
	 * Широкую подпись .nav-copy таблица стилей прячет в двух случаях:
	 * при свернутом меню (dente-redesign.css:354, [data-collapsed="true"]) и на
	 * узких экранах (dente-redesign.css:588, @media max-width 1140px). В обоих
	 * рельса превращалась в столбик безымянных значков — ровно это и снято на
	 * .dente-redesign-shots/desktop_light_patients.png. Свернутое состояние
	 * запоминается в localStorage (App.tsx:945), то есть один случайный клик
	 * оставлял администратора без подписей навсегда.
	 *
	 * Поэтому под значком показываем короткую подпись из того же viewLabels
	 * ровно в этих двух случаях. Значок и подписи лежат в одной обертке, чтобы
	 * у .nav-item был единственный ребенок: заданный в CSS зазор 11px между
	 * детьми тогда не участвует в раскладке и вертикальный ритм задается здесь.
	 *
	 * Классы — утилиты Tailwind; они лежат в @layer utilities и по правилам
	 * каскада проигрывают рукописному CSS проекта, поэтому назначаются только
	 * свойствам, которых ни один селектор проекта у этих элементов не задает
	 * (см. пояснение в styles/tailwind.css). Цвет наследуется от .nav-item,
	 * то есть темы light/dark/night работают без единого статичного цвета.
	 */
	const navSlotClass = collapsed
		? "flex w-full min-w-0 flex-col items-center gap-[0.1875rem] text-center"
		: "flex w-full min-w-0 items-center gap-[0.6875rem] max-[1140px]:flex-col max-[1140px]:gap-[0.1875rem] max-[1140px]:text-center";
	const navCaptionClass = collapsed
		? "block max-w-full text-[0.625rem] font-semibold leading-[1.15] break-words"
		: "hidden max-w-full text-[0.625rem] font-semibold leading-[1.15] break-words max-[1140px]:block";

	return (
		<aside className="sidebar" data-collapsed={collapsed}>
			<div className="brand-mark">
				<Stethoscope aria-hidden="true" />
				<span>DENTE</span>
			</div>
			{/*
        Имя ориентира переехало с <aside> на <nav>: программа чтения с экрана
        объявляла «Навигация» на дополнительном блоке, а сам список разделов
        оставался безымянным ориентиром. Двух подписей не заводим.
      */}
			<nav aria-label="Навигация">
				{appViews.map((view) =>
					allowedViews.includes(view) ? (
						<a
							className={`nav-item ${currentView === view ? "active" : ""}`}
							href={`#${view}`}
							key={view}
							aria-current={currentView === view ? "page" : undefined}
							aria-label={`${viewLabels[view]}: ${viewHints[view]}`}
							title={`${viewLabels[view]}: ${viewHints[view]}`}
							onPointerEnter={() => onViewIntent?.(view)}
							onFocus={() => onViewIntent?.(view)}
							onTouchStart={() => onViewIntent?.(view)}
						>
							<span className={navSlotClass}>
								<SidebarIcon section={view} />
								<span className="nav-copy">
									<span className="nav-label">{viewLabels[view]}</span>
									<small>{viewHints[view]}</small>
								</span>
								<span className={navCaptionClass}>{viewLabels[view]}</span>
							</span>
						</a>
					) : null,
				)}
			</nav>
			{/*
        Утилиты назначены только тем свойствам, которых у <p> не задаёт ни один
        селектор проекта: перенос слов и max-width уже стоят глобально
        (styles/main.css:517-528, вне слоёв — они выиграли бы у утилит), поэтому
        повторять их здесь нечем. Цвет не задаётся вовсе: он наследуется, и
        строка работает во всех трёх темах без единого статичного значения.
        На узком экране рельса сужается до 76px (dente-redesign.css:606) —
        прозе там места нет, строка убирается вместе с подписями разделов.
      */}
			{modeExplanation && !collapsed ? (
				<p
					className="mt-[0.75rem] text-[0.6875rem] leading-[1.4] opacity-70 max-[1140px]:hidden"
					title={modeExplanation}
				>
					Режим «{modeTitle}» — скрыты разделы: {hiddenSectionNames}.{" "}
					<span className="sr-only">
						{hiddenCapabilityNames
							? `Также упрощены: ${hiddenCapabilityNames}. `
							: ""}
						Разделы не удалены, они вернутся при смене режима.
					</span>
					<a
						href="#settings"
						onPointerEnter={() => onViewIntent?.("settings")}
						onFocus={() => onViewIntent?.("settings")}
					>
						Изменить режим
					</a>
				</p>
			) : null}
			<div className="sidebar-footer">
				<ThemeSwitcher />
				<button
					className="icon-button sidebar-collapse-button"
					type="button"
					aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
					title={collapsed ? "Развернуть меню" : "Свернуть меню"}
					aria-pressed={collapsed}
					onClick={onToggleCollapsed}
				>
					<ChevronsLeft aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}

function ThemeSwitcher() {
	const themeMode = useThemeStore((state) => state.themeMode);
	const setThemeMode = useThemeStore((state) => state.setThemeMode);
	/*
	 * Подписи были «День», «Тьма», «Ночь»: чем «Тьма» отличается от «Ночи», по
	 * экрану понять нельзя. Темы при этом разные по-настоящему — у dark холодная
	 * серо-синяя палитра, у night тёплая коричневая (см. dente-redesign.css). Так
	 * и подписываем, а подробное объяснение уходит в подсказку при наведении.
	 */
	const options: Array<{ mode: ThemeMode; label: string; hint: string }> = [
		{ mode: "light", label: "День", hint: "Светлая тема" },
		{
			mode: "dark",
			label: "Ночь",
			hint: "Тёмная тема в холодных серо-синих тонах",
		},
		{
			mode: "night",
			label: "Тепло",
			hint: "Тёмная тема в тёплых коричневых тонах — мягче для глаз вечером",
		},
	];

	return (
		// В слове «интерфейса» предпоследняя буква была латинской c: подпись
		// выглядела верно, но программа чтения с экрана произносила её неправильно,
		// и поиск по тексту такую строку не находил.
		<div role="toolbar" className="theme-switcher" aria-label="Тема интерфейса">
			{options.map((option) => (
				<button
					key={option.mode}
					type="button"
					aria-pressed={themeMode === option.mode}
					aria-label={option.hint}
					title={option.hint}
					onClick={() => setThemeMode(option.mode)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

type WorkspaceTopbarProps = {
	clinicName: string;
	onGoToDictation: () => void;
	onGoToSchedule: () => void;
	/**
	 * ДОЛГ, А НЕ ЖИВОЕ ПОЛЕ. Больше не читается: ярлык врача на приём переведён на
	 * `onGoToDictation`, который делает то же самое плюс ставит курсор в поле
	 * диктовки (см. строку действий ниже). Поле оставлено только потому, что его
	 * по-прежнему передаёт `App.tsx:2390-2392`, а этот файл в объём правки не
	 * входит: убрать его нужно с двух сторон одновременно, иначе вызывающая
	 * сторона перестанет собираться.
	 */
	onGoToVisit: () => void;
	onReopenOnboarding: () => void;
	onRoleChange: (role: StaffRole) => void;
	onViewIntent?: WorkspaceViewIntentHandler;
	roleFocusOrder: StaffRole[];
	selectedWorkspaceRole: StaffRole;
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	staffRoleLabels: Record<StaffRole, string>;
	todayIso: string;
	onLockSession?: () => void;
};

export function WorkspaceTopbar({
	clinicName,
	onGoToDictation,
	onGoToSchedule,
	onReopenOnboarding,
	onRoleChange,
	onViewIntent,
	roleFocusOrder,
	selectedWorkspaceRole,
	showAdministrationTopActions,
	showDoctorVisitShortcut,
	staffRoleLabels,
	todayIso,
	onLockSession,
}: WorkspaceTopbarProps) {
	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
		weekday: "long",
	}).format(new Date(`${todayIso}T12:00:00`));

	/*
	 * Порядок ролей приходит из AppHelpers (roleFocusOrder) и содержит все пять.
	 * У отдельного врача ассистента, администратора и управляющего нет: три из
	 * пяти кнопок предлагали переключиться на сотрудника, которого не существует.
	 * Какие роли при режиме есть — решает таблица в lib/clinicCapabilities.ts.
	 *
	 * Берётся staffRoleChoices, а не visibleStaffRoles: роль хранится отдельно от
	 * режима и выбирается в мастере настройки, поэтому «Управляющий», выбранный до
	 * перехода на режим отдельного врача, оставался в заголовке рядом со списком,
	 * где его нет, и ни одна кнопка не была подсвечена. Текущая роль остаётся в
	 * списке всегда — иначе человек не видит, где он находится.
	 */
	const clinicMode = useSettingsStore((s) => s.clinicMode);
	const availableRoles = staffRoleChoices(
		roleFocusOrder,
		clinicMode,
		selectedWorkspaceRole,
	);

	return (
		<header className="topbar">
			<div className="topbar-context">
				<div className="topbar-clinic">
					<p className="eyebrow">
						{formattedDate.replace(" г.", "").replace(",", " ·")}
					</p>
					<h1>{clinicName}</h1>
				</div>
				<details
					className="workspace-role-switcher"
					aria-label={workspaceTopbarLabels.role.region}
				>
					<summary>
						<span>{workspaceTopbarLabels.role.caption}</span>
						<strong>{staffRoleLabels[selectedWorkspaceRole]}</strong>
					</summary>
					<div className="role-switcher-options">
						{availableRoles.map((role) => (
							<button
								className={selectedWorkspaceRole === role ? "active" : ""}
								key={role}
								type="button"
								aria-pressed={selectedWorkspaceRole === role}
								aria-label={`${workspaceTopbarLabels.role.region}: ${staffRoleLabels[role]}`}
								onClick={(event) => {
									onRoleChange(role);
									event.currentTarget
										.closest("details")
										?.removeAttribute("open");
								}}
							>
								{staffRoleLabels[role]}
							</button>
						))}
					</div>
				</details>
				<RecentPatientHistoryWidget compactDropdown />
			</div>
			{/*
        ПОРЯДОК В ЭТОЙ СТРОКЕ — И ЕСТЬ ГАРАНТИЯ, ЧТО «ЗАПИСЬ» НЕ УЕДЕТ НА ВТОРУЮ
        СТРОКУ. Это не стиль и не вкус, а следствие правил переноса.

        `.top-actions` получает право на перенос от
        `components/workspaceActions/workspaceActions.css:38` — селектор
        `.topbar .top-actions:has(> .dnt-actions-mount--header)` (специфичность
        0,3,0) перебивает `.top-actions` из `styles/dente-redesign.css:391`
        (0,1,0). Сам `.topbar` переноса не имеет, а `.top-actions` сжимаема, и
        рядом стоит `.topbar-context` с `flex-wrap: wrap !important`
        (`dente-redesign.css:1046-1051`). Значит перенос зависит НЕ от ширины
        экрана, а от длины названия клиники и подписи роли: длинное название
        переносит строку на любом мониторе.

        ГАРАНТИЯ ДЕРЖИТСЯ НА ОДНОМ ПРАВИЛЕ: ПЕРВЫЙ ЭЛЕМЕНТ СТРОКИ НЕ УЕЗЖАЕТ
        ВНИЗ НИКОГДА. Это не эвристика и не запас по ширине, а буквальное
        требование раскладки: набирая строку, flex обязан положить на неё первый
        же элемент, даже если тот в неё не влезает («if the very first uncollapsed
        flex item ... would exceed the available space, it is nonetheless placed
        into the line by itself» — CSS Flexible Box Layout, сбор элементов в
        строки). Поэтому «Запись» стоит здесь ПЕРВОЙ, и никакая ширина, никакое
        название клиники и никакой состав соседей не могут её перенести.

        ПОЧЕМУ ЭТОГО НЕ ДАВАЛ ПРЕЖНИЙ ПОРЯДОК, И ЭТО ИЗМЕРЕНО, А НЕ ВЫВЕДЕНО.
        До этой правки «Запись» стояла раньше всего НЕОБЯЗАТЕЛЬНОГО, но ПОЗЖЕ
        группы помощника — и этого не хватало, потому что группа не сжимается
        (`flex: 0 0 auto`, `workspaceActions.css:24`) и способна занять строку
        одна. Замер в headless-хромиуме на настоящих таблицах стилей: на 900px
        «Запись» оказывалась на ВТОРОЙ строке и на ней одна. Причина ровно эта:
        до 1140px «Настроить» и «Заблокировать» скрыты
        (`dente-redesign.css:610`), поэтому единственное, что перенос может
        забрать после группы, — само главное действие. Прежний порядок исправлял
        1440-1600px и не исправлял 841-1140px.

        ЧТО ЭТА ПРАВКА НЕ ДЕЛАЕТ, СКАЗАНО СРАЗУ: ОНА НЕ СНИЖАЕТ ВЫСОТУ ШАПКИ.
        Тем же замером: `.topbar` = 171px, из них `.topbar-context` — 146px, а вся
        строка действий — 86px даже в два ряда. Строка действий НИЖЕ соседа на
        60px, то есть высоту шапки задаёт не она, и ни один порядок кнопок её не
        уменьшит. Высота — это `.topbar-context` (название клиники, переключатель
        роли, недавние пациенты) и `flex-wrap: wrap !important`
        (`dente-redesign.css:1046-1051`). Здесь исправлено то, что действительно
        зависит от этой строки: КТО на первом ряду, а не сколько ряды занимают.

        Что перенос забирает теперь, по возрастанию цены: сначала «Настроить» и
        «Заблокировать» (обе несут `.compact-top-button` и на узком экране и так
        скрыты — `dente-redesign.css:610` и `:624`), затем инструменты помощника.
        Главное действие не забирается никогда.
      */}
			<div className="top-actions">
				{/*
          ГЛАВНОЕ ДЕЙСТВИЕ — ПЕРВЫМ ЭЛЕМЕНТОМ СТРОКИ И БЕЗ УСЛОВИЯ ВОКРУГ.
          Оба свойства несут смысл. «Первым» даёт гарантию из шапки строки.
          «Без условия» — то, что делает гарантию безусловной: если бы первым
          стоял элемент, обёрнутый в проверку роли, то у роли без него первым
          снова становился бы сосед, и «Запись» снова могла бы уехать вниз.

          Побочно это исправляет обход с клавиатуры: до правки человек проходил
          «Поиск», «Голос» и «Справку» прежде, чем добраться до записи пациента.
        */}
				<button
					className="primary-button"
					type="button"
					title={workspaceTopbarLabels.book.title}
					onPointerEnter={() => onViewIntent?.("schedule")}
					onFocus={() => onViewIntent?.("schedule")}
					onTouchStart={() => onViewIntent?.("schedule")}
					onClick={onGoToSchedule}
				>
					<Plus aria-hidden="true" /> {workspaceTopbarLabels.book.label}
				</button>

				{/*
          ЯРЛЫК ВРАЧА НА ПРИЁМ. Ведёт `onGoToDictation`, а не `onGoToVisit`, и это
          осознанная замена, а не описка.

          Здесь раньше стояли ДВА элемента: подписанная «Прием» (переход в приём)
          и безымянная кнопка-микрофон (переход в приём ПЛЮС курсор в поле
          диктовки). Второе — надмножество первого, то есть в строке лежали две
          кнопки в один и тот же раздел, причём у более полезной не было подписи.
          Микрофон удалён, его единственная собственная способность —
          фокус на поле диктовки — досталась подписанной кнопке.

          Кнопка показывается только врачу и только когда он не в приёме
          (`showDoctorVisitShortcut`, useAppLogic.tsx:13721-13722). Остальные роли
          в приём не ходят: `getFilteredAppViews` не содержит `visit` для
          администратора, управляющего и ассистента, и охранник маршрута
          (useAppLogic.tsx:4380-4386) вернул бы их на «Смену».
        */}
				{showDoctorVisitShortcut ? (
					<button
						className="secondary-button daily-top-button"
						type="button"
						title={workspaceTopbarLabels.visit.title}
						onPointerEnter={() => onViewIntent?.("visit")}
						onFocus={() => onViewIntent?.("visit")}
						onTouchStart={() => onViewIntent?.("visit")}
						onClick={onGoToDictation}
					>
						<ClipboardCheck aria-hidden="true" />{" "}
						{workspaceTopbarLabels.visit.label}
					</button>
				) : null}

				{/*
          ГРУППА ДЕЙСТВИЙ ПОМОЩНИКА (поиск, голос, справка) — ОДИН элемент, а не
          три новых соседа. Эти три кнопки раньше плавали в правом нижнем углу
          поверх страницы и накрывали её элементы: механизм «уступи кнопке под
          собой» был арифметически неисполним (обоснование и замеры —
          `components/workspaceActions/workspaceActionsPlacement.ts`), поэтому он
          удалён, а действия переехали в существующую фурнитуру.

          ГРУППА СТОИТ ПОСЛЕ ГЛАВНОГО ДЕЙСТВИЯ, И ЭТО ОСОЗНАННАЯ ЗАМЕНА РЕШЕНИЯ,
          ЗАПИСАННОГО ЗДЕСЬ РАНЬШЕ. Прежний комментарий (из правки угла,
          `f0121f0c2`) обещал, что группа «не участвует в переносе», потому что
          стоит первой. Первой она в переносе действительно не участвует — но
          именно поэтому переносилось то, что стояло за ней, а за ней стояло
          главное действие продукта. Замер на 900px: «Запись» на второй строке и
          на ней одна. Решение принималось без замера; замер его отменил.

          Сама группа при этом не тронута ничем: она по-прежнему приходит одной
          сегментированной единицей с общей рамкой и читается отдельным блоком.
          Изменилось только её место в строке — а место точки монтажа принадлежит
          шапке, а не файлам группы.

          Это ЕДИНСТВЕННАЯ точка монтажа группы на весь проект. На узком экране
          она сама вставляет свой контейнер в живую нижнюю навигацию и рисует в
          него портал, а этот якорь остаётся пустым и скрывается через `:empty`
          (`workspaceActions.css:29-31`). Так `App.tsx` не нужно править ради
          второй точки монтажа. Следствие для замеров: до 840px группы в шапке
          НЕТ вообще, поэтому стенд, который держит её в шапке на 390px, мерит
          раскладку, которой не существует.
        */}
				<WorkspaceActionsMount />

				{/*
          НЕОБЯЗАТЕЛЬНЫЕ КНОПКИ — ПОСЛЕДНИМИ, потому что перенос забирает
          последних. Обе несут `.compact-top-button` и потому скрыты до 1140px
          (`dente-redesign.css:610`): там в строке остаются только «Запись»,
          «Прием» и группа. Порядок внутри необязательного значения не имеет —
          главное действие стоит первым, а первый элемент строки не переносится
          вовсе (разбор — в комментарии к началу строки действий).

          Отсюда же удалён безымянный значок базы данных со ссылкой на
          `#settings`. Он рисовался тем же глифом `Database`, что и пункт
          «Настройки» бокового меню (`sidebarIcons.settings` выше), вёл по тому же
          адресу, и его имя для программы чтения с экрана обещало «настройки
          импорта и экспорта», которых один хеш `#settings` не открывает. Роли,
          которым он вообще показывался (администратор, управляющий, владелец —
          useAppLogic.tsx:13716-13720), все имеют подписанный пункт «Настройки» в
          боковом меню: `getFilteredAppViews` содержит `settings` для каждой из
          них, а `viewsHiddenByFeatureFlags` этот раздел не отнимает никогда.
          То есть удалён дубль, а не путь.
        */}
				{showAdministrationTopActions ? (
					<button
						className="secondary-button compact-top-button"
						type="button"
						title={workspaceTopbarLabels.setup.title}
						onClick={onReopenOnboarding}
					>
						<ClipboardCheck aria-hidden="true" />{" "}
						{workspaceTopbarLabels.setup.label}
					</button>
				) : null}

				{/*
          ЗАМОК РАБОЧЕГО МЕСТА. Изменены две вещи, и обе — дефекты, а не отделка.

          1. ПОЯВИЛАСЬ ВИДИМАЯ ПОДПИСЬ. Это был значок без слов: смысл жил в
             `title`, то есть на касании не жил вообще.
          2. УБРАН КЛАСС `.top-lock-button`, а вместе с ним аварийный красный
             (`dente-redesign.css:274` — `color: var(--bad-fg) !important`).
             Красный в палитре означает опасность; запереть рабочее место в конце
             смены — обычное безопасное действие, и его цвет отбирал внимание у
             «Записи», стоявшей рядом. Класс удалён, а не перекрыт: `!important`
             из таблицы стилей не перебить ни утилитой Tailwind, ни `style`.
             `.compact-top-button` сохраняет прежнее скрытие на узком экране
             (`dente-redesign.css:610` и `:624` перечисляют его наравне с бывшим
             `.top-lock-button`).
        */}
				{onLockSession ? (
					<button
						className="secondary-button compact-top-button"
						type="button"
						title={workspaceTopbarLabels.lock.title}
						onClick={onLockSession}
					>
						<Lock aria-hidden="true" /> {workspaceTopbarLabels.lock.label}
					</button>
				) : null}
			</div>
		</header>
	);
}
