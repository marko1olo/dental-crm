/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephMeasurementsSidebar.tsx
 * Layer 4: Clinical Measurements Sidebar for Cephalometrics.
 */

import React from "react";
import { CephPatientDemoSidebar } from "./CephPatientDemoSidebar";
import { CephLandmarksTab } from "./CephLandmarksTab";
import { CephAnglesTab } from "./CephAnglesTab";
import { CephReportTab } from "./CephReportTab";
import type { CephMeasurementsSidebarProps } from "./cephStudioTypes";

export const CephMeasurementsSidebar: React.FC<CephMeasurementsSidebarProps> = ({
	theme,
	isPatientDemoMode,
	activeTab,
	onTabChange,
	analysis,
	landmarks,
	activeTargetKey,
	onSelectTargetKey,
	copiedProtocol,
	onCopyProtocol,
	onInsertToChart,
}) => {
	const isLight = theme === "light";
	return (
		<aside
			className={`w-96 sm:w-[440px] border-l flex flex-col shrink-0 overflow-hidden shadow-2xl transition-colors ${
				isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
			}`}
			data-testid="ceph-studio-sidebar"
		>
			{isPatientDemoMode ? (
				<CephPatientDemoSidebar
					theme={theme}
					analysis={analysis}
					onInsertToChart={onInsertToChart}
				/>
			) : (
				<div className="flex-1 flex flex-col overflow-hidden">
					<div className="h-11 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 flex items-center gap-1 shrink-0">
						<button
							type="button"
							onClick={() => onTabChange("landmarks")}
							data-testid="ceph-tab-landmarks"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "landmarks"
									? isLight
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Ориентиры ({analysis.placedCount})
						</button>
						<button
							type="button"
							onClick={() => onTabChange("angles")}
							data-testid="ceph-tab-angles"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "angles"
									? isLight
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Расчет углов ({analysis.measurements.filter((m) => m.value !== null).length})
						</button>
						<button
							type="button"
							onClick={() => onTabChange("report")}
							data-testid="ceph-tab-report"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "report"
									? isLight
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Медицинская карта
						</button>
					</div>

					{activeTab === "landmarks" && (
						<CephLandmarksTab
							theme={theme}
							analysis={analysis}
							landmarks={landmarks}
							activeTargetKey={activeTargetKey}
							onSelectTargetKey={onSelectTargetKey}
						/>
					)}

					{activeTab === "angles" && (
						<CephAnglesTab
							theme={theme}
							analysis={analysis}
						/>
					)}

					{activeTab === "report" && (
						<CephReportTab
							theme={theme}
							protocolText={analysis.diagnosis.protocol043Text}
							copiedProtocol={copiedProtocol}
							onCopyProtocol={onCopyProtocol}
						/>
					)}
				</div>
			)}
		</aside>
	);
};
