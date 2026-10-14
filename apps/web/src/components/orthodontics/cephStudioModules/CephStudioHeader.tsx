/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephStudioHeader.tsx
 *
 * Layer 4: Studio Cockpit Topbar for dual-monitor orthodontic cephalometrics.
 * Doctor vs patient mode toggle, EMR bridge trigger, diagnostic status chips.
 */

import React from "react";
import {
	Activity,
	Maximize2,
	Minimize2,
	Moon,
	Share2,
	Sparkles,
	Sun,
	UserCheck,
	X,
} from "lucide-react";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";
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
	return (
		<header
			className={`h-14 px-4 flex items-center justify-between gap-3 shrink-0 shadow-sm border-b ${
				theme === "light"
					? "bg-white border-slate-200 text-slate-800"
					: "bg-slate-900 border-slate-800 text-slate-100"
			}`}
			data-testid="ceph-studio-header"
		>
			{/* Left: Window Exit & Patient Identification */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onCloseWindow}
					data-testid="btn-ceph-close-window"
					className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
						theme === "light"
							? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
							: "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
					}`}
					title="Закрыть окно студии"
				>
					<X size={15} />
					<span className="hidden sm:inline">Закрыть</span>
				</button>

				<div className={`h-6 w-px ${theme === "light" ? "bg-slate-200" : "bg-slate-800"}`} />

				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-500">
						<Activity size={16} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className={`text-xs sm:text-sm font-black tracking-wide m-0 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
								ТРГ СТУДИЯ
							</h1>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
								theme === "light"
									? "bg-teal-100 border border-teal-300 text-teal-800"
									: "bg-teal-950 border border-teal-800/80 text-teal-300"
							}`}>
								CEPH STUDIO 2.0
							</span>
						</div>
						<p className={`text-[11px] m-0 truncate max-w-[200px] sm:max-w-[320px] ${theme === "light" ? "text-slate-500" : "text-slate-300"}`}>
							{patientName}
						</p>
					</div>
				</div>
			</div>

			{/* Center: Live Diagnostic Chips (Always visible to doctor) */}
			<div className="hidden lg:flex items-center gap-2">
				<div className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"}`}>
					<span className="text-slate-400 text-[11px]">Ориентиры:</span>
					<span className="font-mono font-bold text-teal-600 dark:text-teal-300">
						{analysis.placedCount}/{CEPHALOMETRIC_LANDMARKS.length}
					</span>
				</div>

				<div className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"}`}>
					<span className="text-slate-400 text-[11px]">Скелетный класс:</span>
					<span
						className={`font-bold ${
							analysis.diagnosis.skeletalClass === "Class I"
								? "text-emerald-500"
								: analysis.diagnosis.skeletalClass === "Class II"
									? "text-amber-500"
									: "text-indigo-500"
						}`}
					>
						{analysis.diagnosis.skeletalClassRu}
					</span>
				</div>

				<div className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"}`}>
					<span className="text-slate-400 text-[11px]">Рост:</span>
					<span className={`font-bold ${theme === "light" ? "text-slate-700" : "text-slate-200"}`}>
						{analysis.diagnosis.growthPatternRu}
					</span>
				</div>

				{torqueRecommendation && (
					<div className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-1.5 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"}`} title={torqueRecommendation.reason}>
						<span className="text-slate-400 text-[11px]">Торк Damon:</span>
						<span className="font-bold text-teal-600 dark:text-cyan-300">{torqueRecommendation.type.split(" ")[0]}</span>
					</div>
				)}
			</div>

			{/* Right: Mode Switchers, Send to EMR & Fullscreen */}
			<div className="flex items-center gap-2">
				{/* ─── PATIENT DEMO MODE TOGGLE ────────────────────────────────────────── */}
				<button
					type="button"
					onClick={onToggleDemoMode}
					data-testid="toggle-patient-demo-mode"
					className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
						isPatientDemoMode
							? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30 ring-2 ring-purple-400/30"
							: theme === "light"
								? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
								: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
					}`}
					title="Переключение между врачебным анализом и демонстрацией для пациента у кресла"
				>
					{isPatientDemoMode ? <Sparkles size={14} /> : <UserCheck size={14} />}
					<span>{isPatientDemoMode ? "Режим пациента" : "Показ пациенту"}</span>
				</button>

				{/* Insert to protocol button */}
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

				{/* Theme switch button */}
				<button
					type="button"
					onClick={onToggleTheme}
					className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
						theme === "light"
							? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
							: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
					}`}
					title={theme === "light" ? "Включить темную тему" : "Включить светлую тему"}
					data-testid="toggle-studio-theme-btn"
				>
					{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
				</button>

				{/* Fullscreen toggle */}
				<button
					type="button"
					onClick={onToggleFullscreen}
					className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
						theme === "light"
							? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
							: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
					}`}
					title={isFullscreen ? "Свернуть полноэкранный режим" : "На весь экран"}
				>
					{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
				</button>
			</div>
		</header>
	);
};
