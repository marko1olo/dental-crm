/**
 * CbctRightSidebar.tsx — Правая панель клинических параметров, анатомии и имплантации (Мандат 8b <= 120 строк).
 */

import React from "react";
import { ChevronRight } from "lucide-react";
import type { CbctRightSidebarProps } from "./sidebar/CbctSidebarTypes";
import { CbctSidebarToothSelector } from "./sidebar/CbctSidebarToothSelector";
import { CbctSidebarRidgeCaliperPanel } from "./sidebar/CbctSidebarRidgeCaliperPanel";
import { CbctSidebarImplantSafetyPanel } from "./sidebar/CbctSidebarImplantSafetyPanel";
import { CbctSidebarImplantSelector } from "./sidebar/CbctSidebarImplantSelector";
import { CbctSidebarExportButtons } from "./sidebar/CbctSidebarExportButtons";
import { CbctNerveSidebarSection } from "./CbctNerveSidebarSection";

export type { CbctRightSidebarProps } from "./sidebar/CbctSidebarTypes";

export const CbctRightSidebar: React.FC<CbctRightSidebarProps> = (props) => {
	const {
		isSidebarOpen,
		setIsSidebarOpen,
		handleSelectTooth,
		activeCaliper,
		ridgeHeightMm,
		ridgeWidthMm,
		nerveAuditResult,
		displayBoneClass,
		displayMeanHU,
		displayTorque,
		displayDrillingProtocol,
		selectedBrand,
		setSelectedBrand,
		selectedDiameterMm,
		setSelectedDiameterMm,
		selectedLengthMm,
		setSelectedLengthMm,
		nervePoints,
		setNervePoints,
		nerveTotalLengthMm,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		handleExportToEmr,
		handleExportPdfReport,
		handleExportToPlan,
		handleExportToFinance,
		handleExport300DpiSnapshot,
	} = props;

	if (!isSidebarOpen) {
		return (
			<button
				type="button"
				onClick={() => setIsSidebarOpen(true)}
				className="w-6 bg-[var(--paper-strong)] border-l border-[var(--line)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors z-20"
				title="Открыть боковую панель"
			>
				<ChevronRight className="w-4 h-4 rotate-180" />
			</button>
		);
	}

	return (
		<aside className="w-72 bg-[var(--paper-strong)] border-l border-[var(--line)] flex flex-col p-3 gap-3 overflow-y-auto select-none flex-shrink-0 z-20">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
					Клинический анализ
				</h3>
				<button
					type="button"
					onClick={() => setIsSidebarOpen(false)}
					className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)]"
					title="Свернуть"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			<CbctSidebarToothSelector onSelectTooth={handleSelectTooth} />

			<CbctSidebarRidgeCaliperPanel
				activeCaliper={activeCaliper}
				ridgeHeightMm={ridgeHeightMm}
				ridgeWidthMm={ridgeWidthMm}
			/>

			<CbctSidebarImplantSafetyPanel
				nerveAuditResult={nerveAuditResult}
				displayBoneClass={displayBoneClass}
				displayMeanHU={displayMeanHU}
				displayTorque={displayTorque}
				displayDrillingProtocol={displayDrillingProtocol}
			/>

			<CbctSidebarImplantSelector
				selectedBrand={selectedBrand}
				setSelectedBrand={setSelectedBrand}
				selectedDiameterMm={selectedDiameterMm}
				setSelectedDiameterMm={setSelectedDiameterMm}
				selectedLengthMm={selectedLengthMm}
				setSelectedLengthMm={setSelectedLengthMm}
			/>

			<CbctNerveSidebarSection
				nervePoints={nervePoints}
				setNervePoints={setNervePoints}
				nerveTotalLengthMm={nerveTotalLengthMm}
				selectedNerveNodeIdx={selectedNerveNodeIdx}
				setSelectedNerveNodeIdx={setSelectedNerveNodeIdx}
			/>

			<CbctSidebarExportButtons
				handleExportToEmr={handleExportToEmr}
				handleExportPdfReport={handleExportPdfReport}
				handleExportToPlan={handleExportToPlan}
				handleExportToFinance={handleExportToFinance}
				handleExport300DpiSnapshot={handleExport300DpiSnapshot}
			/>
		</aside>
	);
};
