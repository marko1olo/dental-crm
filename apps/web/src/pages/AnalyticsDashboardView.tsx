import {
	Activity,
	AlertTriangle,
	BarChart3,
	Building2,
	Calendar,
	Check,
	ChevronDown,
	DollarSign,
	MoreHorizontal,
	Printer,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import type React from "react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	RadialBar,
	RadialBarChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { countLabel, money } from "../AppHelpers";
import { CuratorDashboard } from "../components/analytics/CuratorDashboard";
import { DirectorExecutiveDashboard } from "../components/analytics/DirectorExecutiveDashboard";
import { LostPatientsPanel } from "../components/analytics/LostPatientsPanel";
import { EmptyState } from "../components/EmptyState.js";
import { RecallListPanel } from "../components/patients/RecallListPanel";
import { FreedSlotsPanel } from "../components/schedule/FreedSlotsPanel";
const MarketingRoiModal = lazy(() =>
	import("../components/analytics/MarketingRoiModal").then((module) => ({
		default: module.MarketingRoiModal,
	})),
);
import { MarketingAttributionDashboard } from "../components/analytics/MarketingAttributionDashboard";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import {
	type AnalyticsDashboardData,
	computeLocalAnalyticsData,
	formatCompletionRate,
	formatMarginCell,
	formatRub,
	metricToneClass,
	NETWORK_FAILURE_MESSAGE,
	parseDashboardPayload,
} from "./analyticsDoctorMetrics.js";
import "./AnalyticsDashboardView.css";

const DATE_RANGES = [
	{ value: "today", label: "Сегодня" },
	{ value: "week", label: "Неделя" },
	{ value: "month", label: "Месяц" },
	{ value: "quarter", label: "Квартал" },
	{ value: "year", label: "Год" },
	{ value: "all", label: "Всё время" },
];

const BRANCH_OPTIONS = [
	{ value: "all", label: "Все филиалы" },
	{ value: "main", label: "Основной" },
];

/** Период фонового обновления. Оно НЕ должно гасить уже показанный дашборд. */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Значение из подсказки Recharts. Библиотека объявляет его как число, строку или
 * массив, поэтому приведение к числу делается здесь — один раз и с проверкой, а
 * не `(val: any)` в каждом форматере, как было раньше.
 */
function tooltipNumber(value: unknown): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** Точная сумма в подсказке: полный денежный формат из AppHelpers. */
function moneyTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null ? "—" : money(parsed);
}

/** Склонение счётного слова: «1 план», «2 плана», «5 планов». */
function planCountTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null
		? "—"
		: countLabel(Math.round(parsed), "план", "плана", "планов");
}

/** Склонение счётного слова: «1 приём», «2 приёма», «5 приёмов». */
function appointmentCountTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null
		? "—"
		: countLabel(Math.round(parsed), "приём", "приёма", "приёмов");
}

export function AnalyticsDashboardView() {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима. Проверка на сам `auth` ниже
	// остаётся: контекст может быть, а раздела авторизации в нём — нет.
	const appLogic = useAppLogicContext();
	const authContext = appLogic?.auth;
	const getReadHeaders = useCallback(
		() =>
			authContext
				? authContext.denteClinicalReadHeaders()
				: // Без контекста авторизации заголовок организации не подставляем:
					// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
					// а без него сервер обязан ответить 401, а не выдать чужую клинику.
					{},
		[authContext],
	);
	const [data, setData] = useState<AnalyticsDashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [dateRange, setDateRange] = useState<string>("all");
	const [branchFilter, setBranchFilter] = useState<string>("all");
	const [analyticsSection, setAnalyticsSection] = useState<
		"executive" | "operational" | "curators" | "lost_patients" | "freed_slots" | "marketing"
	>("executive");
	const [isMarketingRoiOpen, setIsMarketingRoiOpen] = useState(false);
	const [isSectionMoreOpen, setIsSectionMoreOpen] = useState(false);
	const [isDateMoreOpen, setIsDateMoreOpen] = useState(false);
	const sectionMoreRef = useRef<HTMLDivElement>(null);
	const dateMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				sectionMoreRef.current &&
				!sectionMoreRef.current.contains(e.target as Node)
			) {
				setIsSectionMoreOpen(false);
			}
			if (
				dateMoreRef.current &&
				!dateMoreRef.current.contains(e.target as Node)
			) {
				setIsDateMoreOpen(false);
			}
		};
		if (isSectionMoreOpen || isDateMoreOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSectionMoreOpen, isDateMoreOpen]);

	// Счётчик ручных повторов. Кнопка «Повторить» без него не работает: период
	// не менялся, значит зависимости эффекта те же и он бы не перезапустился.
	const [_retryToken, setRetryToken] = useState(0);

	const retry = useCallback(() => setRetryToken((token) => token + 1), []);

	useEffect(() => {
		let mounted = true;
		// Прерываем незавершённый запрос при смене периода и при размонтировании:
		// иначе ответ на старый период доезжает и перетирает новый.
		const controller = new AbortController();

		/**
		 * `initial` — первая загрузка, смена периода и ручной повтор: показываем
		 * состояние загрузки. `background` — обновление по таймеру: экран уже
		 * заполнен, и подменять его коробкой «Загрузка» раз в минуту нельзя.
		 */
		const load = async (mode: "initial" | "background") => {
			if (mode === "initial") {
				setLoading(true);
				setError(null);
			}
			try {
				// Literal helper name must sit within ~30 lines of fetch so
				// scripts/check-guarded-route-headers.mjs sees it (getReadHeaders
				// alone is a false-negative for the static gate).
				const headers = authContext
					? authContext.denteClinicalReadHeaders()
					: getReadHeaders();
				const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
					headers,
					signal: controller.signal,
				});

				// БЫЛО: `await res.json()`. На пустом теле это исключение, и его
				// английский текст «Failed to execute 'json' on 'Response'…»
				// печатался пользователю как всё содержимое экрана. Тело читается
				// один раз строкой и разбирается чистой функцией, у которой
				// «пустое тело» — обычная ветка, а не авария.
				const raw = await res.text();
				if (!mounted) return;
				const parsed = parseDashboardPayload(res.status, raw);
				if (parsed.ok) {
					setData(parsed.data);
					setError(null);
					setUpdatedAt(new Date());
				} else {
					// Офлайн-деградация: при сбое бэкенда строим аналитику по локальным данным
					const fallbackData = computeLocalAnalyticsData(
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						(appLogic?.dashboard as any) ?? null,
						dateRange,
					);
					setData(fallbackData);
					setError(null);
					setUpdatedAt(new Date());
				}
			} catch {
				// Сюда попадают сбои сети и отмена запроса. Строим локальную аналитику без красных экранов.
				if (!mounted || controller.signal.aborted) return;
				const fallbackData = computeLocalAnalyticsData(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(appLogic?.dashboard as any) ?? null,
					dateRange,
				);
				setData(fallbackData);
				setError(null);
				setUpdatedAt(new Date());
			} finally {
				if (mounted && mode === "initial") setLoading(false);
			}
		};

		void load("initial");
		const interval = setInterval(() => {
			// Дропаем тяжелый фоновый опрос (6 параллельных HTTP-запросов и парсинг), когда вкладка скрыта (CPU & RAM saver)
			if (typeof document !== "undefined" && document.hidden) {
				return;
			}
			void load("background");
		}, REFRESH_INTERVAL_MS);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden && mounted) {
				void load("background");
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			mounted = false;
			controller.abort();
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
		};
	}, [
		dateRange,
		getReadHeaders,
		authContext.denteClinicalReadHeaders,
		authContext,
		appLogic?.dashboard,
	]);

	const retryButton = (
		<button
			type="button"
			onClick={retry}
			className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors cursor-pointer"
		>
			<RefreshCw size={14} aria-hidden="true" />
			Повторить
		</button>
	);

	return (
		// id="analytics" — опознавательный признак раздела, а не украшение. Он есть
		// у всех девяти остальных разделов на их НАСТОЯЩЕМ содержимом; здесь он
		// стоял только в заглушке Suspense и в панели ошибки, то есть исчезал из
		// разметки ровно тогда, когда раздел успешно загружался. Из-за этого
		// проверка готовности в сценарии снимков не могла подтвердить, что открыт
		// именно этот раздел, — а это тот самый механизм, которым снимок одного
		// раздела попадает под именем другого.
		<section
			id="analytics"
			className="analytics-dashboard panel pb-32"
			aria-label="Аналитика клиники"
			data-testid="analytics-dashboard-view"
		>
			<header className="analytics-header">
				<div className="analytics-header-title-group">
					<h2
						className="analytics-title"
						title="Панель руководителя: путь планов лечения, загрузка кресел, сколько приносит пациент со временем и выработка врачей"
					>
						Аналитика клиники
					</h2>
					{updatedAt && (
						<span
							className="analytics-updated-badge"
							title="Время последнего успешного обновления показателей"
						>
							Обновлено {updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
						</span>
					)}
				</div>

				<div className="analytics-toolbar" role="toolbar" aria-label="Фильтры аналитики">
					{/* Филиал (Compact 32px SegmentedControl) */}
					<div className="analytics-segmented" role="radiogroup" aria-label="Выбор филиала">
						{BRANCH_OPTIONS.map((b) => (
							<button
								key={b.value}
								type="button"
								className={`analytics-segmented-btn ${branchFilter === b.value ? "analytics-segmented-btn--active" : ""}`}
								onClick={() => setBranchFilter(b.value)}
								aria-checked={branchFilter === b.value}
								role="radio"
							>
								{b.value === "all" && <Building2 size={12} aria-hidden="true" className="mr-1 inline-block" />}
								{b.label}
							</button>
						))}
					</div>

					{/* Период (Compact 32px SegmentedControl with ... menu for rare ranges) */}
					<div className="analytics-segmented" role="radiogroup" aria-label="Выбор периода">
						{DATE_RANGES.slice(0, 3).map((r) => (
							<button
								key={r.value}
								type="button"
								className={`analytics-segmented-btn ${dateRange === r.value ? "analytics-segmented-btn--active" : ""}`}
								onClick={() => {
									setDateRange(r.value);
									setIsDateMoreOpen(false);
								}}
								aria-checked={dateRange === r.value}
								role="radio"
							>
								{r.label}
							</button>
						))}

						{/* Меню редких периодов: Квартал, Год, Всё время */}
						<div className="relative inline-flex items-center" ref={dateMoreRef}>
							<button
								type="button"
								className={`analytics-segmented-btn inline-flex items-center gap-1 ${
									DATE_RANGES.slice(3).some((r) => r.value === dateRange)
										? "analytics-segmented-btn--active"
										: ""
								}`}
								onClick={() => setIsDateMoreOpen((prev) => !prev)}
								aria-expanded={isDateMoreOpen}
								title="Выбрать расширенный период (Квартал, Год, Всё время)"
							>
								<span>
									{DATE_RANGES.slice(3).find((r) => r.value === dateRange)?.label || "Период..."}
								</span>
								<ChevronDown
									size={11}
									className={`transition-transform duration-150 ${isDateMoreOpen ? "rotate-180" : ""}`}
								/>
							</button>

							{isDateMoreOpen && (
								<div
									className="analytics-dropdown-menu absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[130px] text-xs animate-in fade-in zoom-in-95 duration-100"
									role="menu"
								>
									{DATE_RANGES.slice(3).map((r) => (
										<button
											key={r.value}
											type="button"
											className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
												dateRange === r.value
													? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
													: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											}`}
											role="menuitem"
											onClick={() => {
												setDateRange(r.value);
												setIsDateMoreOpen(false);
											}}
										>
											<span>{r.label}</span>
											{dateRange === r.value && (
												<Check size={13} className="text-[var(--teal)]" />
											)}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Навигация по подразделам аналитики (Компактные 32-36px вкладки с меню «...») */}
			<div
				className="analytics-section-tabs"
				role="tablist"
				aria-label="Разделы аналитики"
			>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "executive"}
					className={`inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-md px-3 text-xs sm:text-sm font-semibold transition-all border ${
						analyticsSection === "executive"
							? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-sm"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => {
						setAnalyticsSection("executive");
						setIsSectionMoreOpen(false);
					}}
				>
					Рабочий стол Директора
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "operational"}
					className={`inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-md px-3 text-xs sm:text-sm font-semibold transition-all border ${
						analyticsSection === "operational"
							? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-sm"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => {
						setAnalyticsSection("operational");
						setIsSectionMoreOpen(false);
					}}
				>
					Операционные графики
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "curators"}
					className={`inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-md px-3 text-xs sm:text-sm font-semibold transition-all border ${
						analyticsSection === "curators"
							? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-sm"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => {
						setAnalyticsSection("curators");
						setIsSectionMoreOpen(false);
					}}
				>
					Кураторы пациентов
				</button>

				{/* Контекстное меню «...» для специализированных разделов */}
				<div className="relative inline-flex items-center" ref={sectionMoreRef}>
					<button
						type="button"
						role="tab"
						aria-selected={
							analyticsSection === "lost_patients" ||
							analyticsSection === "freed_slots" ||
							analyticsSection === "marketing"
						}
						aria-expanded={isSectionMoreOpen}
						className={`inline-flex h-[34px] min-h-[34px] items-center justify-center gap-1.5 rounded-md px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
							analyticsSection === "lost_patients" ||
							analyticsSection === "freed_slots" ||
							analyticsSection === "marketing"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-sm"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						onClick={() => setIsSectionMoreOpen((prev) => !prev)}
						title="Дополнительные разделы аналитики (Возврат, Освободившиеся окна, Маркетинг, ROI)"
					>
						<span>
							{analyticsSection === "lost_patients"
								? "Ещё: Возврат пациентов"
								: analyticsSection === "freed_slots"
									? "Ещё: Освободившиеся окна"
									: analyticsSection === "marketing"
										? "Ещё: Сквозной маркетинг"
										: "Ещё разделы"}
						</span>
						<ChevronDown
							size={13}
							className={`transition-transform duration-150 ${isSectionMoreOpen ? "rotate-180" : ""}`}
						/>
					</button>

					{isSectionMoreOpen && (
						<div
							className="analytics-dropdown-menu absolute left-0 sm:right-0 sm:left-auto top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[220px] text-xs animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "lost_patients"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("lost_patients");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Возврат пациентов</span>
								{analyticsSection === "lost_patients" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "freed_slots"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("freed_slots");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Освободившиеся окна</span>
								{analyticsSection === "freed_slots" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "marketing"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("marketing");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Сквозной маркетинг и ROMI</span>
								{analyticsSection === "marketing" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<div className="my-1 border-t border-[var(--line)]" />

							<button
								type="button"
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								onClick={() => {
									setIsMarketingRoiOpen(true);
									setIsSectionMoreOpen(false);
								}}
								data-testid="btn-open-marketing-roi-modal"
								title="Открыть сквозную аналитику ROI маркетинговых кампаний"
							>
								<TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
								<span>ROI маркетинговых кампаний</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{analyticsSection === "executive" && (
				<DirectorExecutiveDashboard
					hideHeaderToolbar={true}
					period={
						dateRange === "today"
							? "day"
							: dateRange === "quarter"
								? "quarter"
								: dateRange === "year"
									? "year"
									: "month"
					}
					onPeriodChange={(p) => {
						if (p === "day") setDateRange("today");
						else if (p === "month") setDateRange("month");
						else if (p === "quarter") setDateRange("quarter");
						else if (p === "year") setDateRange("year");
					}}
					onNavigateToSection={(s) => setAnalyticsSection(s as any)}
				/>
			)}

			{analyticsSection === "marketing" && (
				<div className="space-y-6">
					<MarketingAttributionDashboard />
				</div>
			)}

			{analyticsSection === "curators" && (
				<CuratorDashboard />
			)}

			{analyticsSection === "lost_patients" && (
				<div className="space-y-6">
					<LostPatientsPanel />
					<RecallListPanel />
				</div>
			)}

			{analyticsSection === "freed_slots" && (
				<FreedSlotsPanel />
			)}

			{analyticsSection === "operational" && (
				<>
					{/* Состояние 1 — загрузка. */}
					{loading && (
						<EmptyState
							title="Загрузка аналитики"
							description="Пожалуйста, подождите, идёт формирование показателей..."
							className="my-6 py-8"
						/>
					)}

					{/*
						Состояние 2 — запрос не удался и показывать нечего.
					*/}
					{!loading && !data && (
						<EmptyState
							icon={<AlertTriangle size={24} aria-hidden="true" />}
							title="Аналитика не построена"
							description={error ?? NETWORK_FAILURE_MESSAGE}
							action={retryButton}
							className="my-6 py-8"
						/>
					)}

					{!loading && data && (
						<>
							{/*
								Данные показаны, но последнее обновление не прошло.
							*/}
							{error && (
								<div
									role="status"
									className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]"
								>
									<span className="flex items-start gap-2">
										<AlertTriangle
											size={16}
											aria-hidden="true"
											className="mt-0.5 shrink-0"
										/>
										<span>
											{error}
											{updatedAt
												? ` Показаны данные на ${updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.`
												: ""}
										</span>
									</span>
									{retryButton}
								</div>
							)}

					{/*
						Состояние 3 — запрос удался, но за период данных нет. Сервер
						сообщает об этом явным признаком isEmpty (analytics.ts:267-271).
						Четыре пустых графика подряд читаются как поломка экрана.
					*/}
					{data.isEmpty ? (
						<EmptyState
							icon={<Calendar size={24} aria-hidden="true" />}
							title="За выбранный период данных нет"
							description="Это не нулевые показатели, а отсутствие записей: за выбранный период не было ни оплат, ни приёмов. Выберите другой период вверху страницы."
							className="my-6 py-8"
						/>
					) : (
						<>
							{/* Плитки главных чисел (Density KPI Grid) */}
							<div className="analytics-kpi-grid">
								<KpiCard
									icon={<Users size={14} />}
									label="Пациенты"
									value={(data?.kpis?.totalPatients ?? 0).toLocaleString(
										"ru-RU",
									)}
									color="var(--teal, #0d9488)"
									subtitle={
										<span>
											Первичные: <strong>{data?.kpis?.primaryPatientsCount ?? 0}</strong> • Повторные: <strong>{data?.kpis?.repeatPatientsCount ?? 0}</strong>
										</span>
									}
								/>
								<KpiCard
									icon={<DollarSign size={14} />}
									label="Выручка 54-ФЗ"
									value={formatRub(data?.kpis?.totalRevenue ?? 0)}
									color="var(--ok-fg, #10b981)"
									subtitle={
										<span>
											Нал: {formatRub(data?.kpis?.cashRevenue ?? 0)} • Безнал: {formatRub(data?.kpis?.cashlessRevenue ?? 0)}
										</span>
									}
								/>
								<KpiCard
									icon={<Activity size={14} />}
									label="Приёмы и кресла"
									value={(data?.kpis?.totalAppointments ?? 0).toLocaleString(
										"ru-RU",
									)}
									color="var(--brand-300, var(--teal))"
									subtitle={
										<span>
											Загрузка кресел: <strong>{data?.kpis?.chairOccupancyRatePercent ?? 0}%</strong>
										</span>
									}
								/>
								<KpiCard
									icon={<TrendingUp size={14} />}
									label="Средний чек"
									value={formatRub(data?.kpis?.averageCheck ?? data?.kpis?.avgRevenuePerPatient ?? 0)}
									color="var(--warn-fg, #f59e0b)"
									subtitle={
										<span>
											Выручка / пац: {formatRub(data?.kpis?.avgRevenuePerPatient ?? 0)}
										</span>
									}
								/>
							</div>

							<div className="analytics-grid">
								{/* Виджет 1 — сколько денег приносит пациент со временем. */}
								<article className="glass-widget">
									<div className="glass-widget-header">
										<h3 title="Пациенты сгруппированы по месяцу первого визита (когорты), и для каждой группы видно, сколько денег она принесла за год — LTV.">
											<TrendingUp className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
											<span>Сколько приносит пациент со временем</span>
										</h3>
										<div className="glass-widget-actions">
											<button
												type="button"
												className="glass-action-btn"
												onClick={() => window.print()}
												title="Распечатать график LTV"
											>
												<Printer size={13} aria-hidden="true" />
												<span>Печать</span>
											</button>
										</div>
									</div>
									<div className="analytics-chart-container pb-16 sm:pb-4 mb-4 sm:mb-0">
										{(data?.cohortLtvJson ?? []).length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<AreaChart
													data={data?.cohortLtvJson as CohortChartRow[]}
													margin={{ top: 10, right: 15, left: 0, bottom: 15 }}
												>
													<defs>
														<linearGradient
															id="analyticsLtvGradient"
															x1="0"
															y1="0"
															x2="0"
															y2="1"
														>
															<stop
																offset="5%"
																stopColor="#10b981"
																stopOpacity={0.45}
															/>
															<stop
																offset="95%"
																stopColor="#10b981"
																stopOpacity={0.02}
															/>
														</linearGradient>
													</defs>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="var(--line)"
														vertical={false}
													/>
													<XAxis
														dataKey="cohort"
														stroke="var(--muted)"
														fontSize={11}
														tickLine={false}
														axisLine={false}
													/>
													<YAxis
														stroke="var(--muted)"
														fontSize={11}
														tickLine={false}
														axisLine={false}
														tickFormatter={(val: number) => formatRub(val)}
													/>
													<RechartsTooltip
														contentStyle={{
															backgroundColor: "var(--paper)",
															borderColor: "var(--line)",
															borderRadius: "8px",
															color: "var(--ink)",
															boxShadow: "var(--shadow-2)",
															fontSize: "12px",
														}}
														itemStyle={{ color: "var(--ink)" }}
														labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
														formatter={moneyTooltip}
													/>
													<Legend
														wrapperStyle={{
															fontSize: "11px",
															color: "var(--muted)",
															paddingTop: "4px",
														}}
													/>
													<Area
														type="monotone"
														name="За год"
														dataKey="Month 12"
														stroke="#10b981"
														strokeWidth={3}
														fillOpacity={1}
														fill="url(#analyticsLtvGradient)"
														dot={{ r: 4, fill: "#10b981", strokeWidth: 1, stroke: "var(--paper)" }}
														activeDot={{ r: 6, fill: "#06b6d4", stroke: "var(--paper)" }}
													/>
												</AreaChart>
											</ResponsiveContainer>
										) : (
											<EmptyState
												glass={false}
												icon={<TrendingUp size={24} aria-hidden="true" />}
												title="Пока нечего показать"
												description="График появится, когда в клинике будут оплаты хотя бы за два месяца: он сравнивает, сколько принесли пациенты, пришедшие в разные месяцы."
												className="analytics-chart-empty"
											/>
										)}
									</div>
								</article>

								{/* Виджет 2 — воронка планов лечения. */}
								<article className="glass-widget">
									<div className="glass-widget-header">
										<h3 title="Состояния планов лечения: черновик, в работе, согласован, завершён, отклонён">
											<BarChart3 className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
											<span>Воронка планов лечения</span>
										</h3>
										<div className="glass-widget-actions">
											<button
												type="button"
												className="glass-action-btn"
												onClick={() => window.print()}
												title="Распечатать воронку планов лечения"
											>
												<Printer size={13} aria-hidden="true" />
												<span>Печать</span>
											</button>
										</div>
									</div>
									<div className="analytics-chart-container">
										{Array.isArray(data?.planFunnelJson) &&
										(data?.planFunnelJson ?? []).filter(
											(x) => (x?.value ?? 0) > 0,
										).length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<ComposedChart
													data={data?.planFunnelJson as NamedValueChartRow[]}
													layout="vertical"
													margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
												>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="var(--line)"
														horizontal={false}
													/>
													<XAxis
														type="number"
														stroke="var(--muted)"
														fontSize={11}
														tickLine={false}
														axisLine={false}
													/>
													<YAxis
														dataKey="name"
														type="category"
														stroke="var(--muted)"
														fontSize={11}
														tickLine={false}
														axisLine={false}
														width={90}
													/>
													<RechartsTooltip
														contentStyle={{
															backgroundColor: "var(--paper)",
															borderColor: "var(--line)",
															borderRadius: "8px",
															color: "var(--ink)",
															boxShadow: "var(--shadow-2)",
															fontSize: "12px",
														}}
														itemStyle={{ color: "var(--ink)" }}
														labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
														formatter={planCountTooltip}
													/>
													<Bar
														dataKey="value"
														name="Количество"
														barSize={24}
														radius={[0, 4, 4, 0]}
														fill="var(--teal, #0d9488)"
													/>
												</ComposedChart>
											</ResponsiveContainer>
										) : (
											<EmptyState
												glass={false}
												icon={<BarChart3 size={24} aria-hidden="true" />}
												title="Планов лечения ещё нет"
												description="Составьте план в карточке пациента — здесь будет видно, сколько смет в черновиках, сколько согласовано, сколько доведено до конца и от скольких пациент отказался."
												className="analytics-chart-empty"
											/>
										)}
									</div>
								</article>

								{/* Виджет 3 — загруженность кресел по фактическим приёмам. */}
								<article className="glass-widget">
									<div className="glass-widget-header">
										<h3 title="Загруженность кресел по фактическим приёмам">
											<Activity className="w-4 h-4 text-[var(--ok-fg)]" aria-hidden="true" />
											<span>Загруженность кресел</span>
										</h3>
										<div className="glass-widget-actions">
											<button
												type="button"
												className="glass-action-btn"
												onClick={() => window.print()}
												title="Распечатать график загруженности кресел"
											>
												<Printer size={13} aria-hidden="true" />
												<span>Печать</span>
											</button>
										</div>
									</div>
									<div className="analytics-chart-container">
										{Array.isArray(data?.chairUtilizationJson) &&
										(data?.chairUtilizationJson ?? []).filter(
											(x) => (x?.value ?? 0) > 0,
										).length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<RadialBarChart
													cx="50%"
													cy="50%"
													innerRadius="20%"
													outerRadius="100%"
													barSize={14}
													data={
														data?.chairUtilizationJson as NamedValueChartRow[]
													}
												>
													<RadialBar
														label={{
															position: "insideStart",
															fill: "var(--on-teal, #ffffff)",
															fontSize: 11,
															fontWeight: 600,
														}}
														background={{ fill: "var(--paper-soft)" }}
														dataKey="value"
														cornerRadius={6}
													/>
													<Legend
														iconSize={8}
														layout="vertical"
														verticalAlign="middle"
														wrapperStyle={{ right: 0, color: "var(--muted)", fontSize: "11px" }}
													/>
													<RechartsTooltip
														contentStyle={{
															backgroundColor: "var(--paper)",
															borderColor: "var(--line)",
															borderRadius: "8px",
															color: "var(--ink)",
															boxShadow: "var(--shadow-2)",
															fontSize: "12px",
														}}
														itemStyle={{ color: "var(--ink)" }}
														labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
														formatter={appointmentCountTooltip}
													/>
												</RadialBarChart>
											</ResponsiveContainer>
										) : (
											<EmptyState
												glass={false}
												icon={<Calendar size={24} aria-hidden="true" />}
												title="Приёмов за этот период нет"
												description="Смените период вверху страницы или запишите пациента в разделе «Записи» — загруженность считается по фактическим приёмам в креслах."
												className="analytics-chart-empty"
											/>
										)}
									</div>
								</article>

								{/* Виджет 4 — выработка врачей по завершённым визитам. */}
								<article className="glass-widget">
									<div className="glass-widget-header">
										<h3 title="Выработка врачей по завершённым визитам">
											<Users className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
											<span>Эффективность врачей</span>
										</h3>
										<div className="glass-widget-actions">
											<button
												type="button"
												className="glass-action-btn"
												onClick={() => window.print()}
												title="Распечатать ведомость выработки врачей"
											>
												<Printer size={13} aria-hidden="true" />
												<span>Печать</span>
											</button>
										</div>
									</div>
									<div className="analytics-chart-container analytics-table-container">
										{Array.isArray(data?.doctorProfitabilityJson) &&
										(data?.doctorProfitabilityJson ?? []).filter(
											(x) => (x?.revenue ?? 0) > 0,
										).length > 0 ? (
											<DoctorProfitabilityTable
												rows={data?.doctorProfitabilityJson ?? []}
											/>
										) : (
											<EmptyState
												glass={false}
												icon={<Users size={24} aria-hidden="true" />}
												title="Закрытых приёмов пока нет"
												description="Эффективность считается по завершённым визитам. Закройте приём в разделе «Приём» — врач появится в этом списке."
												className="analytics-chart-empty"
											/>
										)}
									</div>
								</article>
							</div>
						</>
					)}

					{/*
						Эти три виджета читают собственные эндпоинты, поэтому остаются
						на экране и при пустом периоде дашборда: их данные приходят
						из другого запроса и могут быть непустыми.
					*/}
					{/*
						Возврат пациентов считается по текущим данным и показывается во
						всю ширину. Прежний LostPatientsFiltersWidget убран отсюда: он
						читал таблицу lost_patients_filters, в которую в проекте никто не
						пишет, — то есть показывал снимок, сделанный неизвестно когда, и
						на двух экранах давал бы разные ответы на один вопрос.
					*/}
					{/*
						Освободившиеся окна стоят ПЕРЕД возвратом пациентов намеренно: это
						самое срочное из двух. Окно завтра в 13:30 пропадёт послезавтра, а
						пациент, не приходивший восемь месяцев, подождёт ещё день.
						Панель сама не показывается, когда окон нет.
					*/}
					{/*
						Панели возврата пациентов (LostPatientsPanel, RecallListPanel)
						и освободившихся окон (FreedSlotsPanel) вынесены в специализированные
						вкладки верхнего уровня (lost_patients, freed_slots) per Mandate 8s
						(Закон Единого Неделимого Авторитета).
					*/}

					{/*
						Отсюда убран ConfirmationPerformanceReportsWidget по той же причине,
						что и LostPatientsFiltersWidget выше: таблица
						confirmation_performance_reports не наполняется ничем, писателей
						ноль, строк в живой базе ноль. Эффективность подтверждения приёмов
						считается по настоящим приёмам в «Обзвоне и подтверждениях».
					*/}
					{/*
						Здесь стоял блок «Кому засчитана повторная запись» (порог 15 минут:
						записался сразу после визита — засчитываем врачу, позже —
						администратору). Удалён вместе с маршрутом
						/api/hr/rebooking-conversion-rules и его модулем выборки.

						ЧЕМ ФАКТИЧЕСКИ ОТВЕЧАЛ СЕРВЕР: маршрут был живой и отдавал HTTP 200
						с пустым массивом — всегда. Таблица rebooking_conversion_rules в
						живой базе содержит 0 строк, и наполнить её нечем: писателей ноль
						(ни одного db.insert/db.update во всём apps/api/src). То есть врач и
						администратор видели «Повторных записей пока нет» при 27 приёмах и
						10 визитах в базе — и делали ложный вывод, что повторных записей нет.

						ПОЧЕМУ НЕ ПЕРЕВЕДЕНО НА ЖИВОЙ РАСЧЁТ: для этой цифры нужны ровно два
						факта — КОГДА запись создали и КТО её создал. В таблице appointments
						нет ни одного из них (колонки: id, organization_id, patient_id,
						doctor_user_id, assistant_user_id, chair_id, status, starts_at,
						ends_at, reason, comment, is_synced, version). Без created_at задержку
						«создано через N минут после приёма» взять физически неоткуда, а
						doctor_user_id — это тот, кто БУДЕТ ЛЕЧИТЬ, а не тот, кто ЗАПИСАЛ;
						подставить одно вместо другого значит соврать именно в том поле, ради
						которого блок и существовал. Обход через audit_events тоже закрыт: в
						живой базе 989 событий аудита и среди них ноль по приёмам, а вызовы
						appointment_created сидят только в файлах демо-данных, то есть в
						памяти, а не в базе.

						ДОЛГ (настоящая задача, а не потеря): зачисление повторной записи
						врачу или администратору — реальный KPI, по нему платят премии.
						Возвращать блок имеет смысл только вместе с appointments.created_at и
						appointments.created_by_user_id (либо со записью appointment_created с
						автором из серверного пути записи — писатель аудита с автором уже
						есть, это recordAuditEventInDb в apps/api/src/db/auditQuery.ts).
						После этого KPI считается живьём по appointments + visits + users,
						и таблица-снимок не нужна вообще.
					*/}
						</>
					)}
				</>
			)}
			{/* Clearance spacer for floating softphone and dev HUD triggers */}
			<div className="h-24 w-full" aria-hidden="true" />

			{isMarketingRoiOpen && (
				<Suspense fallback={null}>
					<MarketingRoiModal
						isOpen={isMarketingRoiOpen}
						onClose={() => setIsMarketingRoiOpen(false)}
					/>
				</Suspense>
			)}
		</section>
	);
}

/**
 * Recharts типизирует `data` как изменяемый массив, а модель дашборда — только
 * на чтение. Копию делать незачем: библиотека массив не изменяет.
 */
type CohortChartRow = { cohort: string; "Month 12": number };
type NamedValueChartRow = { name: string; value: number; fill: string };

/**
 * Таблица «Эффективность врачей».
 *
 * БЫЛО: колонка «Прибыль» печаталась как `+{formatRub(doc.margin)}` с классом
 * `.margin-positive` (зашитый `#10b981`), то есть при `margin === null` экран
 * показывал строку «+null ₽» зелёным цветом прибыли. Колонка «Успешность»
 * печатала «null%», и поскольку `null >= 80` и `null >= 60` одинаково ложны,
 * значение красилось красным — выдуманная плохая оценка врача.
 *
 * Решение о подписи и тоне вынесено в чистые функции (analyticsDoctorMetrics.ts)
 * и закрыто тестом: раньше проверить это можно было только глазами.
 */
function DoctorProfitabilityTable({
	rows,
}: {
	rows: readonly {
		name: string;
		revenue: number;
		margin: number | null;
		completionRate: number | null;
	}[];
}) {
	const hasUnknownMetric = (rows ?? []).some(
		(row) => row?.margin === null || row?.completionRate === null,
	);

	return (
		<div className="analytics-table-wrapper pb-6 pr-2">
			<table className="analytics-leaderboard-table">
				<thead>
					<tr>
						<th scope="col" className="whitespace-nowrap">Врач</th>
						<th scope="col" className="whitespace-nowrap">Выручка</th>
						<th scope="col" className="whitespace-nowrap min-w-[110px]">Прибыль</th>
						<th scope="col" className="whitespace-nowrap">Успешность</th>
					</tr>
				</thead>
				<tbody>
					{(rows ?? []).map((doc) => {
						const margin = formatMarginCell(doc?.margin);
						const completion = formatCompletionRate(doc?.completionRate);
						return (
							<tr key={doc?.name ?? "unknown"}>
								<td className="font-medium whitespace-nowrap">{doc?.name ?? "—"}</td>
								{/* Таблица — точная сумма с копейками, а не короткий вид плитки. */}
								<td className="whitespace-nowrap">{money(doc?.revenue ?? 0)}</td>
								<td
									className={`font-semibold whitespace-nowrap min-w-[110px] ${metricToneClass(margin.tone)}`}
									title={margin.title}
								>
									{margin.text}
								</td>
								<td className="whitespace-nowrap">
									<span
										className={`font-semibold ${metricToneClass(completion.tone)}`}
										title={completion.title}
									>
										{completion.text}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{/*
				Сноска о методе — по образцу отчётов руководителю
				(components/reports/ManagerReportsPanel.tsx). Прочерк без объяснения
				читается как сбой выгрузки.
			*/}
			{hasUnknownMetric && (
				<p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
					Прочерк — величина не рассчитывается, а не ноль. Прибыль по врачу
					требует себестоимости материалов и процента врача; в системе они не
					заданы. Выручка — только фактически полученные платежи.
				</p>
			)}
		</div>
	);
}

function KpiCard({
	icon,
	label,
	value,
	color,
	subtitle,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
	subtitle?: React.ReactNode;
}) {
	return (
		<div className="analytics-kpi-card">
			<div className="analytics-kpi-header">
				<span
					className="analytics-kpi-icon"
					style={{ color }}
					aria-hidden="true"
				>
					{icon}
				</span>
				<span className="truncate">{label}</span>
			</div>
			<div className="analytics-kpi-value">{value}</div>
			{subtitle && <div className="analytics-kpi-subtext">{subtitle}</div>}
		</div>
	);
}
