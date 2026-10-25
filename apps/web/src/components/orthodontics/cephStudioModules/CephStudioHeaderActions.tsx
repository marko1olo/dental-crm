import React from "react";
import { Maximize2, Minimize2, Moon, Share2, Sparkles, Sun, UserCheck } from "lucide-react";

export interface CephStudioHeaderActionsProps {
	readonly theme: "light" | "dark";
	readonly isPatientDemoMode: boolean;
	readonly isFullscreen: boolean;
	readonly onToggleDemoMode: () => void;
	readonly onInsertToChart: () => void;
	readonly onToggleTheme: () => void;
	readonly onToggleFullscreen: () => void;
}

export const CephStudioHeaderActions: React.FC<CephStudioHeaderActionsProps> = ({
	theme,
	isPatientDemoMode,
	isFullscreen,
	onToggleDemoMode,
	onInsertToChart,
	onToggleTheme,
	onToggleFullscreen,
}) => {
	const isLight = theme === "light";
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onToggleDemoMode}
				data-testid="toggle-patient-demo-mode"
				className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
					isPatientDemoMode
						? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30 ring-2 ring-purple-400/30"
						: isLight
							? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
							: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
				}`}
				title="Переключение между врачебным анализом и демонстрацией для пациента у кресла"
			>
				{isPatientDemoMode ? <Sparkles size={14} /> : <UserCheck size={14} />}
				<span>{isPatientDemoMode ? "Режим пациента" : "Показ пациенту"}</span>
			</button>

			<button
				type="button"
				onClick={onInsertToChart}
				data-testid="btn-ceph-insert-protocol"
				className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
				title="Передать расчет ТРГ в открытую карту пациента в основном окне"
			>
				<Share2 size={14} />
				<span className="hidden md:inline">В карту пациента</span>
			</button>

			<button
				type="button"
				onClick={onToggleTheme}
				className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
					isLight
						? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
						: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
				}`}
				title={isLight ? "Включить темную тему" : "Включить светлую тему"}
				data-testid="toggle-studio-theme-btn"
			>
				{isLight ? <Moon size={15} /> : <Sun size={15} />}
			</button>

			<button
				type="button"
				onClick={onToggleFullscreen}
				className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
					isLight
						? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
						: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
				}`}
				title={isFullscreen ? "Свернуть полноэкранный режим" : "На весь экран"}
			>
				{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
			</button>
		</div>
	);
};
