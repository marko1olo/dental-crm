import React from "react";
import { Activity, ExternalLink, MonitorUp, Sparkles } from "lucide-react";
import type { CtLaunchMode } from "./types";

export interface CtSelectorLaunchModesProps {
	readonly launchMode: CtLaunchMode;
	readonly setLaunchMode: (mode: CtLaunchMode) => void;
	readonly isDesktop: boolean;
	readonly selectedViewerId: string;
	readonly setSelectedViewerId: (id: string) => void;
}

export const CtSelectorLaunchModes: React.FC<CtSelectorLaunchModesProps> = ({
	launchMode,
	setLaunchMode,
	isDesktop,
	selectedViewerId,
	setSelectedViewerId,
}) => {
	return (
		<section
			className="flex flex-col gap-2"
			data-testid="ct-selector-launch-modes"
			aria-label="Режим запуска КТ"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Режим открытия КТ
				</span>
				<span className="text-[11px] text-[var(--muted)]">
					{launchMode === "standalone_window"
						? "Отдельное окно для второго монитора врача"
						: launchMode === "external_app"
							? "Нативный просмотрщик производителя томографа"
							: "Встроенный просмотрщик внутри медицинской карты"}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				{/* Режим 1: В текущем окне CRM */}
				<button
					type="button"
					onClick={() => setLaunchMode("crm_window")}
					data-testid="mode-crm-window"
					className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
						launchMode === "crm_window"
							? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-xs"
							: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper)]"
					}`}
				>
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
							launchMode === "crm_window"
								? "bg-teal-600 text-white"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						<Activity size={16} />
					</div>
					<div className="min-w-0">
						<strong className="block text-xs font-bold text-[var(--ink)]">
							В текущем окне CRM
						</strong>
						<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
							Встроенная 3D Студия и MPR-срезы прямо в медкарте
						</span>
					</div>
				</button>

				{/* Режим 2: В отдельном окне DENTE (для 2-го монитора) */}
				<button
					type="button"
					onClick={() => setLaunchMode("standalone_window")}
					data-testid="mode-standalone-window"
					className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
						launchMode === "standalone_window"
							? "border-cyan-500 bg-cyan-500/10 shadow-xs"
							: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-cyan-500/40 hover:bg-[var(--paper)]"
					}`}
				>
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
							launchMode === "standalone_window"
								? "bg-cyan-600 text-white"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						<MonitorUp size={16} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<strong className="text-xs font-bold text-[var(--ink)]">
								В отдельном окне
							</strong>
							<span className="text-[10px] font-semibold px-1 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
								2-й монитор
							</span>
						</div>
						<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
							Автономный полноэкранный вьюер без помех для CRM
						</span>
					</div>
				</button>

				{/* Режим 3: В приложении томографа (Picasso / Ez3D / Romexis) */}
				<button
					type="button"
					onClick={() => setLaunchMode("external_app")}
					data-testid="mode-external-app"
					className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
						launchMode === "external_app"
							? "border-amber-500 bg-amber-500/10 shadow-xs"
							: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-amber-500/40 hover:bg-[var(--paper)]"
					}`}
				>
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
							launchMode === "external_app"
								? "bg-amber-600 text-white"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						<ExternalLink size={16} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<strong className="text-xs font-bold text-[var(--ink)]">
								Вьюер томографа
							</strong>
							<span className="text-[10px] font-semibold px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
								Picasso/Ez3D
							</span>
						</div>
						<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
							{isDesktop
								? "Запуск нативного приложения производителя"
								: "Доступно в приложении DENTE Desktop (.exe)"}
						</span>
					</div>
				</button>
			</div>

			{/* Выбор внешнего просмотрщика томографа при активном external_app */}
			{launchMode === "external_app" && (
				<div className="mt-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap text-xs">
					<div className="flex items-center gap-2">
						<Sparkles size={14} className="text-amber-600 shrink-0" />
						<span className="text-[var(--ink)] font-medium">
							Программа для запуска исследования:
						</span>
					</div>
					<div className="flex items-center gap-2">
						<select
							value={selectedViewerId}
							onChange={(e) => setSelectedViewerId(e.target.value)}
							className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-amber-500 cursor-pointer"
							data-testid="select-external-ct-viewer"
						>
							<option value="picasso">Picasso Viewer (Vatech / E-WOO)</option>
							<option value="ez3d">Ez3D-i / Ez3D2009 (Vatech)</option>
							<option value="romexis">Planmeca Romexis 3D</option>
							<option value="ondemand3d">CyberMed OnDemand3D</option>
							<option value="icat">i-CATVision</option>
						</select>
					</div>
				</div>
			)}
		</section>
	);
};
