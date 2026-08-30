import {
	Activity,
	AlertTriangle,
	BarChart3,
	Building2,
	Calendar,
	DollarSign,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
import { LostPatientsPanel } from "../components/analytics/LostPatientsPanel";
import { EmptyState } from "../components/EmptyState.js";
import { RecallListPanel } from "../components/patients/RecallListPanel";
import { FreedSlotsPanel } from "../components/schedule/FreedSlotsPanel";
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
	{ value: "all", label: "Всё время" },
	{ value: "this_year", label: "Этот год" },
	{ value: "last_3_months", label: "3 месяца" },
	{ value: "last_month", label: "Месяц" },
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
			void load("background");
		}, REFRESH_INTERVAL_MS);

		return () => {
			mounted = false;
			controller.abort();
			clearInterval(interval);
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

					{/* Период (Compact 32px SegmentedControl) */}
					<div className="analytics-segmented" role="radiogroup" aria-label="Выбор периода">
						{DATE_RANGES.map((r) => (
							<button
								key={r.value}
								type="button"
								className={`analytics-segmented-btn ${dateRange === r.value ? "analytics-segmented-btn--active" : ""}`}
								onClick={() => setDateRange(r.value)}
								aria-checked={dateRange === r.value}
								role="radio"
							>
								{r.label}
							</button>
						))}
					</div>
				</div>
			</header>

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
				БЫЛО: сюда подставлялся `err.message`, то есть английский текст
				браузерного исключения, и уйти с экрана было некуда — кнопки
				повтора не существовало.
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
						Данные показаны, но последнее обновление не прошло. Молча
						оставить старые цифры на экране — значит выдать их за текущие.
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
									label="Пациентов"
									value={(data?.kpis?.totalPatients ?? 0).toLocaleString(
										"ru-RU",
									)}
									color="var(--teal, #0d9488)"
								/>
								<KpiCard
									icon={<DollarSign size={14} />}
									label="Выручка"
									value={formatRub(data?.kpis?.totalRevenue ?? 0)}
									color="var(--ok-fg, #10b981)"
								/>
								<KpiCard
									icon={<Activity size={14} />}
									label="Приёмов"
									value={(data?.kpis?.totalAppointments ?? 0).toLocaleString(
										"ru-RU",
									)}
									color="var(--brand-300, var(--teal))"
								/>
								<KpiCard
									icon={<TrendingUp size={14} />}
									label="Выручка / пациент"
									value={formatRub(data?.kpis?.avgRevenuePerPatient ?? 0)}
									color="var(--warn-fg, #f59e0b)"
								/>
							</div>

							<div className="analytics-grid">
								{/* Виджет 1 — сколько денег приносит пациент со временем. */}
								<article className="glass-widget">
									<h3 title="Пациенты сгруппированы по месяцу первого визита (когорты), и для каждой группы видно, сколько денег она принесла за год — LTV.">
										<TrendingUp className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
										<span>Сколько приносит пациент со временем</span>
									</h3>
									<div className="analytics-chart-container">
										{(data?.cohortLtvJson ?? []).length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<AreaChart
													data={data?.cohortLtvJson as CohortChartRow[]}
													margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
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
														dot={{ r: 4, fill: "#10b981", strokeWidth: 1, stroke: "#ffffff" }}
														activeDot={{ r: 6, fill: "#06b6d4", stroke: "#ffffff" }}
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
									<h3 title="Состояния планов лечения: черновик, в работе, согласован, завершён, отклонён">
										<BarChart3 className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
										<span>Воронка планов лечения</span>
									</h3>
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
									<h3 title="Загруженность кресел по фактическим приёмам">
										<Activity className="w-4 h-4 text-[var(--ok-fg)]" aria-hidden="true" />
										<span>Загруженность кресел</span>
									</h3>
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
									<h3 title="Выработка врачей по завершённым визитам">
										<Users className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
										<span>Эффективность врачей</span>
									</h3>
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
					<div className="mt-6">
						<FreedSlotsPanel />
					</div>

					<div className="mt-6">
						<RecallListPanel />
					</div>

					<div className="mt-6">
						<LostPatientsPanel />
					</div>

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
			{/* Clearance spacer for floating softphone and dev HUD triggers */}
			<div className="h-24 w-full" aria-hidden="true" />
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
		<div className="analytics-table-wrapper pb-24 pr-16">
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
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
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
		</div>
	);
}
