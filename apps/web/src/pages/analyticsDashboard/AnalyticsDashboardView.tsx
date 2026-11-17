import "../AnalyticsDashboardView.css";
import { useEffect, useState } from "react";
import { ExecutiveAnalyticsStudioModal } from "../../components/analytics/ExecutiveAnalyticsStudioModal";
import { useClinicAnalyticsSSOT } from "../../components/analytics/useAnalyticsDashboardData";
import { AnalyticsHeaderBar } from "./AnalyticsHeaderBar";
import { AnalyticsSubDashboards } from "./AnalyticsSubDashboards";
import type { AnalyticsSection } from "./types";

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
	const [isAnalyticsStudioOpen, setIsAnalyticsStudioOpen] = useState(false);

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
			} else if (hash.includes("analytics-studio") || hash.includes("executive-studio")) {
				setIsAnalyticsStudioOpen(true);
			} else if (hash.includes("analytics")) {
				setAnalyticsSection("executive");
			}
		};

		const handleOpenStudio = () => setIsAnalyticsStudioOpen(true);

		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("dente:open-analytics-studio", handleOpenStudio);

		if (typeof window !== "undefined") {
			const hash = window.location.hash.toLowerCase();
			if (hash.includes("analytics-studio") || hash.includes("executive-studio")) {
				setIsAnalyticsStudioOpen(true);
			}
		}

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("dente:open-analytics-studio", handleOpenStudio);
		};
	}, []);

	const {
		loading,
		retry,
		handleExportCsv,
	} = useClinicAnalyticsSSOT(
		dateRange === "today"
			? "day"
			: dateRange === "yesterday"
				? "yesterday"
				: dateRange === "week"
					? "week"
					: dateRange === "quarter"
						? "quarter"
						: dateRange === "year"
							? "year"
							: "month",
	);

	return (
		// id="analytics" — канонический идентификатор раздела для селекторов и тестовых инспекций
		<section
			id="analytics"
			className="analytics-dashboard panel pb-32"
			aria-label="Аналитика клиники"
			data-testid="analytics-dashboard-view"
		>
			<AnalyticsHeaderBar
				updatedAt={null}
				dateRange={dateRange}
				setDateRange={setDateRange}
				branchFilter={branchFilter}
				setBranchFilter={setBranchFilter}
				analyticsSection={analyticsSection}
				setAnalyticsSection={setAnalyticsSection}
				loading={loading}
				onExportCsv={() => handleExportCsv("DENTE Dental CRM")}
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

			{/* Каноническая модалка Студии управленческой аналитики */}
			<ExecutiveAnalyticsStudioModal
				isOpen={isAnalyticsStudioOpen}
				onClose={() => setIsAnalyticsStudioOpen(false)}
				initialPeriod={
					dateRange === "today"
						? "day"
						: dateRange === "yesterday"
							? "yesterday"
							: dateRange === "week"
								? "week"
								: dateRange === "quarter"
									? "quarter"
									: dateRange === "year"
										? "year"
										: "month"
				}
			/>

			{/* Clearance spacer for floating softphone and dev HUD triggers */}
			<div className="h-24 w-full" aria-hidden="true" />
		</section>
	);
}
