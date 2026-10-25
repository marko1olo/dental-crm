import React from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { CephActiveTab, CephMobileView } from "./types";
import type { CephalometricAnalysisResult } from "../cephalometricMath";

export interface CephModalSidebarTabsNavProps {
	readonly activeTab: CephActiveTab;
	readonly setActiveTab: (tab: CephActiveTab) => void;
	readonly setMobileView: (view: CephMobileView) => void;
	readonly isImageLoaded: boolean;
	readonly analysis: CephalometricAnalysisResult;
}

export const CephModalSidebarTabsNav: React.FC<CephModalSidebarTabsNavProps> = ({
	activeTab,
	setActiveTab,
	setMobileView,
	isImageLoaded,
	analysis,
}) => {
	return (
		<div className="grid grid-cols-3 border-b border-[var(--line)] bg-[var(--paper-soft)] px-2 pt-1.5 shrink-0 gap-1 w-full">
			<button
				type="button"
				onClick={() => { setActiveTab("landmarks"); setMobileView("landmarks"); }}
				className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "landmarks" ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--paper)] rounded-t-lg shadow-xs" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"}`}
				title="Ориентиры ТРГ"
			>
				<span className="hidden sm:inline whitespace-nowrap">1. Ориентиры ({isImageLoaded ? analysis.placedCount : 0}/16)</span>
				<span className="sm:hidden whitespace-nowrap">1. Точки ({isImageLoaded ? analysis.placedCount : 0})</span>
			</button>

			<button
				type="button"
				onClick={() => {
					if (isImageLoaded) { setActiveTab("metrics"); setMobileView("metrics"); }
					else { showToast("Сначала загрузите снимок ТРГ", "warning"); }
				}}
				className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "metrics" ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--paper)] rounded-t-lg shadow-xs" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
				title="Расчет углов (Steiner, Tweed, Downs, McNamara)"
			>
				<span className="hidden sm:inline whitespace-nowrap">2. Расчет углов</span>
				<span className="sm:hidden whitespace-nowrap">2. Углы</span>
				{isImageLoaded && analysis.isComplete && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
			</button>

			<button
				type="button"
				onClick={() => { setActiveTab("report"); setMobileView("report"); }}
				className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "report" ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--paper)] rounded-t-lg shadow-xs" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"}`}
				title="Ортодонтический протокол ТРГ для карты"
			>
				<FileText size={14} className="shrink-0" />
				<span className="hidden sm:inline whitespace-nowrap">3. Медицинская карта</span>
				<span className="sm:hidden whitespace-nowrap">3. Карта</span>
			</button>
		</div>
	);
};
