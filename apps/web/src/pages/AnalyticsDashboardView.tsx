import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Calendar, DollarSign, Filter, PieChart, RefreshCw, TrendingUp, Users } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	Pie,
	PieChart as RechartsPie,
	RadialBar,
	RadialBarChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { countLabel, money } from "../AppHelpers";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useIsActiveTab } from "../hooks/useIsActiveTab";
import { RecallListPanel } from "../components/patients/RecallListPanel";
import { RebookingConversionRulesWidget } from "../components/analytics/RebookingConversionRulesWidget";
import { EmptyState } from "../components/EmptyState.js";
import {
	formatCompletionRate,
	formatMarginCell,
	formatRub,
	metricToneClass,
	NETWORK_FAILURE_MESSAGE,
	parseDashboardPayload,
	type AnalyticsDashboardData,
} from "./analyticsDoctorMetrics.js";
import "./AnalyticsDashboardView.css";

const DATE_RANGES = [
	{ value: "all", label: "За всё время" },
	{ value: "last_month", label: "Последний месяц" },
	{ value: "last_3_months", label: "Последние 3 месяца" },
	{ value: "this_year", label: "Текущий год" },
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
	return parsed === null ? "—" : countLabel(Math.round(parsed), "план", "плана", "планов");
}

/** Склонение счётного слова: «1 приём», «2 приёма», «5 приёмов». */
function appointmentCountTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null ? "—" : countLabel(Math.round(parsed), "приём", "приёма", "приёмов");
}

export function AnalyticsDashboardView() {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const getReadHeaders = () =>
		authContext
			? authContext.denteClinicalReadHeaders()
			// Без контекста авторизации заголовок организации не подставляем:
			// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
			// а без него сервер обязан ответить 401, а не выдать чужую клинику.
			: {};
	const [data, setData] = useState<AnalyticsDashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [dateRange, setDateRange] = useState<string>("all");
	// Счётчик ручных повторов. Кнопка «Повторить» без него не работает: период
	// не менялся, значит зависимости эффекта те же и он бы не перезапустился.
	const [retryToken, setRetryToken] = useState(0);

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
				const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
					headers: getReadHeaders(),
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
					setError(parsed.message);
					// Фоновая неудача не стирает уже показанные цифры: пустой экран
					// вместо данных минутной давности — потеря, а не честность.
					// Возраст данных подписан выше таблиц.
					if (mode === "initial") setData(null);
				}
			} catch {
				// Сюда попадают только сбои сети и отмена запроса. Текст исключения
				// наружу не идёт ни при каких условиях: он английский.
				if (!mounted || controller.signal.aborted) return;
				setError(NETWORK_FAILURE_MESSAGE);
				if (mode === "initial") setData(null);
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
	}, [dateRange, retryToken]);

	const retryButton = (
		<button
			type="button"
			onClick={retry}
			className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium hover:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
		>
			<RefreshCw size={16} aria-hidden="true" />
			Повторить
		</button>
	);

	return (
		<div className="analytics-dashboard panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]" aria-label="Аналитика клиники" data-testid="analytics-dashboard-view">
			<header className="analytics-header flex flex-wrap gap-3 justify-between items-center mb-5 pb-3 border-b border-[var(--line)]">
				<h2 className="m-0 text-xl font-bold text-[var(--ink)]" title="Панель руководителя: путь планов лечения, загрузка кресел, сколько приносит пациент со временем и выработка врачей">Аналитика клиники</h2>
				<select
					value={dateRange}
					onChange={(e) => setDateRange(e.target.value)}
					title="Период, за который считаются показатели"
					aria-label="Период, за который считаются показатели"
					className="px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all cursor-pointer hover:border-[var(--teal)]"
				>
					{DATE_RANGES.map((r) => (
						<option key={r.value} value={r.value}>
							{r.label}
						</option>
					))}
				</select>
			</header>

			{/* Состояние 1 — загрузка. */}
			{loading && (
				<EmptyState title="Загрузка аналитики" description="Пожалуйста, подождите, идёт формирование показателей..." className="my-6 py-8" />
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
								<AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
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
							{/* Плитки главных чисел. Формат короткий: в плитке длинная сумма не читается. */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: 16,
									marginBottom: 24,
								}}
							>
								<KpiCard
									icon={<Users size={18} />}
									label="Пациентов"
									value={data.kpis.totalPatients.toLocaleString("ru-RU")}
									color="#3b82f6"
								/>
								<KpiCard
									icon={<DollarSign size={18} />}
									label="Выручка"
									value={formatRub(data.kpis.totalRevenue)}
									color="#10b981"
								/>
								<KpiCard
									icon={<Activity size={18} />}
									label="Приёмов"
									value={data.kpis.totalAppointments.toLocaleString("ru-RU")}
									color="#8b5cf6"
								/>
								<KpiCard
									icon={<TrendingUp size={18} />}
									label="Выручка на пациента"
									value={formatRub(data.kpis.avgRevenuePerPatient)}
									color="#f59e0b"
								/>
							</div>

							<div className="analytics-grid">
							{/* Виджет 1 — сколько денег приносит пациент со временем.
							    БЫЛО в заголовке: «Выручка по когортам (LTV)». Ни «когорта», ни
							    «LTV» врачу и администратору ничего не говорят. Название теперь
							    объясняет смысл, термин остался в подсказке для тех, кто ищет
							    именно его. */}
							<article className="glass-widget">
								{/*
									Термины в подсказке оставлены намеренно — для тех, кто ищет
									именно их, — но каждый объяснён по-русски, а заголовок
									обходится без них.
								*/}
								<h3 title="Пациенты сгруппированы по месяцу первого визита (это и называют когортами), и для каждой группы видно, сколько денег она принесла за год — то есть LTV.">
									<TrendingUp className="w-5 h-5 text-dente-teal" /> Сколько
									приносит пациент со временем
								</h3>
								<div className="widget-chart-container">
									{data.cohortLtvJson && data.cohortLtvJson.length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart
												data={data.cohortLtvJson as CohortChartRow[]}
												margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
											>
												<defs>
													<linearGradient
														id="colorMonth12"
														x1="0"
														y1="0"
														x2="0"
														y2="1"
													>
														<stop
															offset="5%"
															stopColor="#8b5cf6"
															stopOpacity={0.8}
														/>
														<stop
															offset="95%"
															stopColor="#8b5cf6"
															stopOpacity={0}
														/>
													</linearGradient>
												</defs>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="#27272a"
													vertical={false}
												/>
												<XAxis
													dataKey="cohort"
													stroke="#a1a1aa"
													fontSize={12}
													tickLine={false}
													axisLine={false}
												/>
												<YAxis
													stroke="#a1a1aa"
													fontSize={12}
													tickLine={false}
													axisLine={false}
													/*
														БЫЛО: `${Math.round(val / 1000)}k` — латинская «k» в
														русском интерфейсе, и округление до целых тысяч: и
														1 400 ₽, и 1 500 ₽ давали одну подпись. Общий короткий
														формат считает честно: «1,4 тыс. ₽».
													*/
													tickFormatter={(val: number) => formatRub(val)}
												/>
												<RechartsTooltip
													contentStyle={{
														backgroundColor: "var(--paper)",
														borderColor: "var(--line)",
														borderRadius: "8px",
														color: "var(--ink)",
													}}
													itemStyle={{ color: "var(--ink)" }}
													/*
														Подсказка показывает точную сумму, поэтому здесь полный
														денежный формат `money` из AppHelpers. БЫЛО: местный
														`val.toLocaleString("ru-RU") + " ₽"` — без ограничения
														дробной части, а деньги приходят с копейками, поэтому в
														подсказке появлялось «3 416,666666666667 ₽».
													*/
													formatter={moneyTooltip}
												/>
												<Legend />
												{/*
													БЫЛО: здесь стояла вторая область с dataKey="Month 1"
													и подписью «1-й месяц». Сервер это поле считать
													перестал (analytics.ts:213-218, `void m1;`), поэтому
													в легенде висела строка, под которой никогда не было
													линии. Осталась одна область — та, которую считают.
												*/}
												<Area
													type="monotone"
													name="За год"
													dataKey="Month 12"
													stroke="#8b5cf6"
													fillOpacity={1}
													fill="url(#colorMonth12)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									) : (
										/* БЫЛО: одна серая строка курсивом «Недостаточно данных по
										   когортам» в пустой рамке на 300 пикселей. Она сообщает, что
										   всё плохо, но не говорит ни почему, ни что делать. */
										<EmptyState
											glass={false}
											title="Пока нечего показать"
											description="График появится, когда в клинике будут оплаты хотя бы за два месяца: он сравнивает, сколько принесли пациенты, пришедшие в разные месяцы."
											style={{ height: "100%", padding: "20px" }}
										/>
									)}
								</div>
							</article>

							{/* Виджет 2 — путь плана лечения: предложен, принят, оплачен. */}
							<article className="glass-widget">
								<h3>
									<BarChart3 className="w-5 h-5 text-sky-500" /> Воронка планов
									лечения
								</h3>
								<div className="widget-chart-container">
									{Array.isArray(data?.planFunnelJson) && data.planFunnelJson.filter((x) => x.value > 0).length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<ComposedChart
												data={data.planFunnelJson as NamedValueChartRow[]}
												layout="vertical"
												margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
											>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="#27272a"
													horizontal={false}
												/>
												<XAxis
													type="number"
													stroke="#a1a1aa"
													fontSize={12}
													tickLine={false}
													axisLine={false}
												/>
												<YAxis
													dataKey="name"
													type="category"
													stroke="#a1a1aa"
													fontSize={12}
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
													}}
													itemStyle={{ color: "var(--ink)" }}
													/* Склонение: «1 план», «2 плана», «5 планов». */
													formatter={planCountTooltip}
												/>
												<Bar
													dataKey="value"
													name="Количество"
													barSize={32}
													radius={[0, 4, 4, 0]}
												/>
											</ComposedChart>
										</ResponsiveContainer>
									) : (
										<EmptyState
											glass={false}
											title="Планов лечения ещё нет"
											description="Составьте план в карточке пациента — здесь будет видно, сколько планов предложено, сколько принято и сколько оплачено."
											style={{ height: "100%", padding: "20px" }}
										/>
									)}
								</div>
							</article>

							{/* Виджет 3 — загруженность кресел по фактическим приёмам. */}
							<article className="glass-widget">
								<h3>
									<Activity className="w-5 h-5 text-emerald-500" /> Загруженность
									кресел
								</h3>
								<div className="widget-chart-container">
									{Array.isArray(data?.chairUtilizationJson) &&
									data.chairUtilizationJson.filter((x) => x.value > 0).length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<RadialBarChart
												cx="50%"
												cy="50%"
												innerRadius="20%"
												outerRadius="100%"
												barSize={16}
												data={data.chairUtilizationJson as NamedValueChartRow[]}
											>
												<RadialBar
													label={{
														position: "insideStart",
														fill: "#fff",
														fontSize: 11,
													}}
													background={{ fill: "#27272a" }}
													dataKey="value"
													cornerRadius={8}
												/>
												<Legend
													iconSize={10}
													layout="vertical"
													verticalAlign="middle"
													wrapperStyle={{ right: 0, color: "#a1a1aa" }}
												/>
												<RechartsTooltip
													contentStyle={{
														backgroundColor: "var(--paper)",
														borderColor: "var(--line)",
														borderRadius: "8px",
														color: "var(--ink)",
													}}
													itemStyle={{ color: "var(--ink)" }}
													formatter={appointmentCountTooltip}
												/>
											</RadialBarChart>
										</ResponsiveContainer>
									) : (
										<EmptyState
											glass={false}
											title="Приёмов за этот период нет"
											description="Смените период вверху страницы или запишите пациента в разделе «Записи» — загруженность считается по фактическим приёмам в креслах."
											style={{ height: "100%", padding: "20px" }}
										/>
									)}
								</div>
							</article>

							{/* Виджет 4 — выработка врачей по завершённым визитам. */}
							<article className="glass-widget">
								<h3>
									<Users className="w-5 h-5 text-purple-500" /> Эффективность врачей
								</h3>
								<div className="widget-chart-container" style={{ overflowY: "auto" }}>
									{data.doctorProfitabilityJson.filter((x) => x.revenue > 0).length > 0 ? (
										<DoctorProfitabilityTable rows={data.doctorProfitabilityJson} />
									) : (
										<EmptyState
											glass={false}
											title="Закрытых приёмов пока нет"
											description="Эффективность считается по завершённым визитам. Закройте приём в разделе «Приём» — врач появится в этом списке."
											style={{ height: "100%", padding: "20px" }}
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
					<div className="mt-6">
						<RecallListPanel />
					</div>

					{/*
						Отсюда убран ConfirmationPerformanceReportsWidget по той же причине,
						что и LostPatientsFiltersWidget выше: таблица
						confirmation_performance_reports не наполняется ничем, писателей
						ноль, строк в живой базе ноль. Эффективность подтверждения приёмов
						считается по настоящим приёмам в «Обзвоне и подтверждениях».
					*/}
					<div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<RebookingConversionRulesWidget />
					</div>
				</>
			)}
		</div>
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
	rows: readonly { name: string; revenue: number; margin: number | null; completionRate: number | null }[];
}) {
	const hasUnknownMetric = rows.some((row) => row.margin === null || row.completionRate === null);

	return (
		<>
			<table className="analytics-leaderboard-table">
				<thead>
					<tr>
						<th scope="col">Врач</th>
						<th scope="col">Выручка</th>
						<th scope="col">Прибыль</th>
						<th scope="col">Успешность</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((doc, idx) => {
						const margin = formatMarginCell(doc.margin);
						const completion = formatCompletionRate(doc.completionRate);
						return (
							<tr key={`${doc.name}-${idx}`}>
								<td>{doc.name}</td>
								{/* Таблица — точная сумма с копейками, а не короткий вид плитки. */}
								<td>{money(doc.revenue)}</td>
								<td className={`font-semibold ${metricToneClass(margin.tone)}`} title={margin.title}>
									{margin.text}
								</td>
								<td>
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
				<p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
					Прочерк — величина не рассчитывается, а не ноль. Прибыль по врачу требует
					себестоимости материалов и процента врача; в системе они не заданы. Выручка —
					только фактически полученные платежи.
				</p>
			)}
		</>
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
		<div
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: 12,
				padding: "16px 20px",
				display: "flex",
				flexDirection: "column",
				gap: 8,
			}}
		>
			{/*
			  БЫЛО: акцентный цвет применялся ко всей строке, то есть и к
			  иконке, и к подписи. Подписи ключевых показателей выходили
			  нечитаемыми: «Ср. выручка / пациент» amber-500 на белом — 2.15,
			  «Выручка» emerald-500 — 2.54, «Пациентов» blue-500 — 3.68,
			  «Приёмов» violet-500 на тёмном фоне ночной темы — 4.2.
			  Это показатели, по которым руководитель читает состояние клиники.

			  Иконке достаточно 3:1 как графическому элементу, поэтому акцент
			  остаётся на ней, а подпись переведена на текстовый токен темы.
			*/}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					color: "var(--ink-2, var(--ink))",
					fontSize: 13,
					fontWeight: 500,
				}}
			>
				<span style={{ color, display: "inline-flex" }} aria-hidden="true">
					{icon}
				</span>
				{label}
			</div>
			<div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
				{value}
			</div>
		</div>
	);
}
