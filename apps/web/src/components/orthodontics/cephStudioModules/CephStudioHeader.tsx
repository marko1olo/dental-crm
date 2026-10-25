/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephStudioHeader.tsx
 * Layer 4: Studio Cockpit Topbar for dual-monitor orthodontic cephalometrics.
 */

import React from "react";
import { Activity, X } from "lucide-react";
import { CephStudioDiagnosticChips } from "./CephStudioDiagnosticChips";
import { CephStudioHeaderActions } from "./CephStudioHeaderActions";
import type { CephStudioHeaderProps } from "./cephStudioTypes";

export const CephStudioHeader: React.FC<CephStudioHeaderProps> = ({
	patientName,
	theme,
	isPatientDemoMode,
	isFullscreen,
	analysis,
	torqueRecommendation,
	onCloseWindow,
	onToggleDemoMode,
	onInsertToChart,
	onToggleTheme,
	onToggleFullscreen,
}) => {
	const isLight = theme === "light";
	return (
		<header
			className={`h-14 px-4 flex items-center justify-between gap-3 shrink-0 shadow-sm border-b ${
				isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
			}`}
			data-testid="ceph-studio-header"
		>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onCloseWindow}
					data-testid="btn-ceph-close-window"
					className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
						isLight
							? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
							: "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
					}`}
					title="Закрыть окно студии"
				>
					<X size={15} />
					<span className="hidden sm:inline">Закрыть</span>
				</button>

				<div className={`h-6 w-px ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-500">
						<Activity size={16} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className={`text-xs sm:text-sm font-black tracking-wide m-0 ${isLight ? "text-slate-900" : "text-white"}`}>
								ТРГ СТУДИЯ
							</h1>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
								isLight ? "bg-teal-100 border border-teal-300 text-teal-800" : "bg-teal-950 border border-teal-800/80 text-teal-300"
							}`}>
								CEPH STUDIO 2.0
							</span>
						</div>
						<p className={`text-[11px] m-0 truncate max-w-[200px] sm:max-w-[320px] ${isLight ? "text-slate-500" : "text-slate-300"}`}>
							{patientName}
						</p>
					</div>
				</div>
			</div>

			<CephStudioDiagnosticChips
				theme={theme}
				analysis={analysis}
				torqueRecommendation={torqueRecommendation}
			/>

			<CephStudioHeaderActions
				theme={theme}
				isPatientDemoMode={isPatientDemoMode}
				isFullscreen={isFullscreen}
				onToggleDemoMode={onToggleDemoMode}
				onInsertToChart={onInsertToChart}
				onToggleTheme={onToggleTheme}
				onToggleFullscreen={onToggleFullscreen}
			/>
		</header>
	);
};
