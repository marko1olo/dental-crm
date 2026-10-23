import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState.js";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { NETWORK_FAILURE_MESSAGE } from "../analyticsDoctorMetrics.js";
import { AnalyticsDoctorsTable } from "./AnalyticsDoctorsTable";
import { AnalyticsHeaderBar } from "./AnalyticsHeaderBar";
import { AnalyticsKpiCards } from "./AnalyticsKpiCards";
import { AnalyticsSubDashboards } from "./AnalyticsSubDashboards";
import { RebookingConversionRulesWidget } from "./RebookingConversionRulesWidget";

const AnalyticsRevenueCharts = lazyWithRetry(() =>
	import("./AnalyticsRevenueCharts").then((module) => ({
		default: module.AnalyticsRevenueCharts,
	})),
);
import type { AnalyticsSection } from "./types";
import { useAnalyticsDashboardData } from "./useAnalyticsDashboardData";

export function AnalyticsDashboardView() {
	const [dateRange, setDateRange] = useState<string>("all");
	const [branchFilter, setBranchFilter] = useState<string>("all");
	const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>(() => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash.toLowerCase();
			const search = window.location.search.toLowerCase();
			if (
				hash.includes("reports") ||
				search.includes("reports") ||
				hash.includes("payout") ||
				search.includes("payout")
			) {
				return "reports";
			}
			if (hash.includes("curator") || search.includes("curator")) {
				return "curators";
			}
			if (hash.includes("lost") || search.includes("lost")) {
				return "lost_patients";
			}
			if (hash.includes("slots") || search.includes("slots")) {
				return "freed_slots";
			}
			if (hash.includes("marketing") || search.includes("marketing")) {
				return "marketing";
			}
		}
		return "executive";
	});
	const [isMarketingRoiOpen, setIsMarketingRoiOpen] = useState(false);
	const [isFinancialAnalyticsOpen, setIsFinancialAnalyticsOpen] = useState(false);

	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.toLowerCase();
			if (hash.includes("reports") || hash.includes("payout")) {
				setAnalyticsSection("reports");
			} else if (hash.includes("curator")) {
				setAnalyticsSection("curators");
			} else if (hash.includes("lost")) {
				setAnalyticsSection("lost_patients");
			} else if (hash.includes("slots")) {
				setAnalyticsSection("freed_slots");
			} else if (hash.includes("marketing")) {
				setAnalyticsSection("marketing");
			} else if (hash.includes("analytics")) {
				setAnalyticsSection("executive");
			}
		};
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const {
		data,
		loading,
		error,
		updatedAt,
		retry,
		handleExportExecutiveCsv,
	} = useAnalyticsDashboardData(dateRange, branchFilter);

	const retryButton = (
		<button
			type="button"
			onClick={retry}
			className="secondary-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors cursor-pointer"
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
			<AnalyticsHeaderBar
				updatedAt={updatedAt}
				dateRange={dateRange}
				setDateRange={setDateRange}
				branchFilter={branchFilter}
				setBranchFilter={setBranchFilter}
				analyticsSection={analyticsSection}
				setAnalyticsSection={setAnalyticsSection}
				loading={loading}
				onExportCsv={handleExportExecutiveCsv}
				onRetry={retry}
				onOpenMarketingRoi={() => setIsMarketingRoiOpen(true)}
				onOpenFinancialAnalytics={() => setIsFinancialAnalyticsOpen(true)}
			/>

			<AnalyticsSubDashboards
				analyticsSection={analyticsSection}
				setAnalyticsSection={setAnalyticsSection}
				dateRange={dateRange}
				setDateRange={setDateRange}
				isMarketingRoiOpen={isMarketingRoiOpen}
				setIsMarketingRoiOpen={setIsMarketingRoiOpen}
				isFinancialAnalyticsOpen={isFinancialAnalyticsOpen}
				setIsFinancialAnalyticsOpen={setIsFinancialAnalyticsOpen}
			/>

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

					{/* Состояние 2 — запрос не удался и показывать нечего. */}
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
							{/* Данные показаны, но последнее обновление не прошло. */}
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

							{/* Состояние 3 — запрос удался, но за период данных нет. */}
							{data.isEmpty ? (
								<EmptyState
									icon={<Calendar size={24} aria-hidden="true" />}
									title="За выбранный период данных нет"
									description="Это не нулевые показатели, а отсутствие записей: за выбранный период не было ни оплат, ни приёмов. Оформите приём в расписании или выберите другой период."
									action={
										<div className="flex items-center gap-2 mt-2">
											<button
												type="button"
												onClick={() => {
													if (typeof window !== "undefined") {
														window.location.hash = "#schedule";
													}
												}}
												className="primary-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
											>
												Записать пациента
											</button>
											<button
												type="button"
												onClick={() => {
													if (typeof window !== "undefined") {
														window.location.hash = "#shift";
													}
												}}
												className="secondary-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] transition-colors cursor-pointer"
											>
												Перейти в кассу
											</button>
										</div>
									}
									className="my-6 py-8"
								/>
							) : (
								<>
									{/* Плитки главных чисел (Density KPI Grid) */}
									<AnalyticsKpiCards data={data} />

									<div className="analytics-grid">
										<Suspense
											fallback={
												<div
													className="analytics-chart-skeleton"
													aria-label="Загрузка графиков выручки"
													aria-busy="true"
												>
													<div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-[var(--muted)]">
														<RefreshCw className="w-8 h-8 animate-spin text-[var(--teal,#0d9488)]" />
														<p className="text-sm font-medium">Подготовка аналитических графиков...</p>
													</div>
												</div>
											}
										>
											<AnalyticsRevenueCharts data={data} />
										</Suspense>
										<AnalyticsDoctorsTable rows={data?.doctorProfitabilityJson ?? []} />
									</div>

									{/* Виджет «Кому засчитана повторная запись» */}
									<RebookingConversionRulesWidget dateRange={dateRange} />
								</>
							)}
						</>
					)}
				</>
			)}

			{/* Clearance spacer for floating softphone and dev HUD triggers */}
			<div className="h-24 w-full" aria-hidden="true" />
		</section>
	);
}
