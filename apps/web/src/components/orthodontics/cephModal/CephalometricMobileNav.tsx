import { CheckCircle2, FileText, Layers } from "lucide-react";
import React from "react";

export interface CephalometricMobileNavProps {
	readonly mobileView: "canvas" | "landmarks" | "metrics" | "report";
	readonly onSelectView: (view: "canvas" | "landmarks" | "metrics" | "report") => void;
	readonly placedCount: number;
	readonly isImageLoaded: boolean;
	readonly isComplete: boolean;
}

export function CephalometricMobileNav({
	mobileView,
	onSelectView,
	placedCount,
	isImageLoaded,
	isComplete,
}: CephalometricMobileNavProps) {
	return (
		<div className="lg:hidden flex items-center gap-1 bg-[var(--paper-soft,#0f172a)] border-b border-[var(--line,#1e293b)] p-1.5 shrink-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none">
			<button
				type="button"
				onClick={() => onSelectView("canvas")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "canvas"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				}`}
				data-testid="ceph-mobile-tab-canvas"
			>
				<Layers size={14} />
				<span>Снимок / Разметка</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectView("landmarks")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "landmarks"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				}`}
				data-testid="ceph-mobile-tab-landmarks"
			>
				<span>16 ориентиров ({isImageLoaded ? placedCount : 0}/16)</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectView("metrics")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "metrics"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
				data-testid="ceph-mobile-tab-metrics"
			>
				<span>Расчет углов</span>
				{isImageLoaded && isComplete && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
			</button>

			<button
				type="button"
				onClick={() => onSelectView("report")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "report"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				}`}
				data-testid="ceph-mobile-tab-report"
			>
				<FileText size={14} />
				<span>Медицинская карта</span>
			</button>
		</div>
	);
}
