import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { DesktopExecutiveView } from "./executiveModules/DesktopExecutiveView";
import { buildTopDoctorsPerformanceRows } from "./executiveModules/ExecutiveDoctorPerformanceTable";
import {
	CANONICAL_PERIOD_OPTIONS,
	ExecutiveCanonicalToolbar,
} from "./executiveModules/ExecutiveCanonicalToolbar";
import { MobileExecutiveView } from "./executiveModules/MobileExecutiveView";
import {
	type ExecutiveDashboardProps,
	type MobileAnalyticsPeriod,
	type TopDoctorPerformanceRow,
} from "./executiveModules/executiveAnalyticsTypes";
import { useExecutiveDashboardData } from "./executiveModules/useExecutiveDashboardData";
import "./executiveDashboard.css";

const FinancialAnalyticsModal = lazy(() =>
	import("./FinancialAnalyticsModal").then((m) => ({ default: m.FinancialAnalyticsModal })),
);

export { CANONICAL_PERIOD_OPTIONS };
export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = (props) => {
	const {
		onNavigateToSection,
		onOpenFinancialAnalytics,
		hideBottomBar = false,
		hideHeaderToolbar = false,
	} = props;

	const isMobile = useIsMobile(768);
	const data = useExecutiveDashboardData(props);
	const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);

	const handleOpenPnl = useCallback(() => {
		if (onOpenFinancialAnalytics) onOpenFinancialAnalytics();
		else if (onNavigateToSection) onNavigateToSection("financial_analytics");
		else setIsPnlModalOpen(true);
	}, [onOpenFinancialAnalytics, onNavigateToSection]);

	const handlePrintPdf = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const topDoctors: TopDoctorPerformanceRow[] = useMemo(() => {
		if (data.payload?.topDoctors && data.payload.topDoctors.length > 0) {
			return data.payload.topDoctors.map((doc, idx) => {
				const initials = doc.name.split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
				return {
					id: doc.doctorUserId || `doc-${idx}`,
					name: doc.name,
					specialty: doc.specialty || "Стоматолог",
					initials: initials || "ВК",
					billed: doc.revenueFormatted,
					averageCheckFormatted: doc.averageCheckFormatted,
					visits: doc.visitsCount,
					attendance: `${doc.attendancePercent}%`,
					complexPlansShare: (doc as any).complexPlansShare || "65%",
					rank: idx + 1,
					badgeColor: "var(--teal, #0d9488)",
				};
			});
		}
		return buildTopDoctorsPerformanceRows([], data.period, isDemoShowcaseMode());
	}, [data.payload?.topDoctors, data.period]);

	const toolbar = !hideHeaderToolbar ? (
		<ExecutiveCanonicalToolbar
			period={data.period}
			setPeriod={data.setPeriod}
			loading={data.loading}
			reload={data.reload}
			handleExportCsv={data.handleExportCsv}
			handleOpenPnl={handleOpenPnl}
		/>
	) : null;

	if (isMobile) {
		return (
			<>
				<MobileExecutiveView
					data={data}
					topDoctors={topDoctors}
					toolbar={toolbar}
					hideBottomBar={hideBottomBar}
					onNavigateToSection={onNavigateToSection}
					onPrintPdf={handlePrintPdf}
				/>
				{isPnlModalOpen && (
					<Suspense fallback={null}>
						<FinancialAnalyticsModal isOpen={isPnlModalOpen} onClose={() => setIsPnlModalOpen(false)} />
					</Suspense>
				)}
			</>
		);
	}

	return (
		<div className="executive-dashboard-desktop-wrapper">
			{toolbar}
			<DesktopExecutiveView {...data} hideHeaderToolbar={true} onNavigateToSection={onNavigateToSection} onOpenFinancialAnalytics={handleOpenPnl} />
			{isPnlModalOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal isOpen={isPnlModalOpen} onClose={() => setIsPnlModalOpen(false)} />
				</Suspense>
			)}
		</div>
	);
};
