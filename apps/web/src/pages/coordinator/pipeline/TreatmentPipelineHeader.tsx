import * as React from "react";
import { Columns, Layers, List, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import type { PipelineViewMode } from "./types";

export interface TreatmentPipelineHeaderProps {
	dropoutRiskCount: number;
	isRunningDropout: boolean;
	isLoading: boolean;
	viewMode: PipelineViewMode;
	onViewModeChange: (mode: PipelineViewMode) => void;
	onRunDropoutPrevention: () => void;
	onRefresh: () => void;
}

export const TreatmentPipelineHeader: React.FC<TreatmentPipelineHeaderProps> = ({
	dropoutRiskCount,
	isRunningDropout,
	isLoading,
	viewMode,
	onViewModeChange,
	onRunDropoutPrevention,
	onRefresh,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 sm:gap-3 pb-2.5 sm:pb-3 border-b border-[var(--line)]">
			{/* Title and Subtitle */}
			<div className="space-y-0.5 min-w-0">
				<div className="flex items-center gap-1.5 sm:gap-2">
					<Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--teal,#0d9488)] shrink-0" />
					<h1 className="text-sm sm:text-xl font-bold tracking-tight text-[var(--text)] whitespace-nowrap">
						<span className="inline sm:hidden">Воронка</span>
						<span className="hidden sm:inline">Воронка планов лечения</span>
					</h1>
				</div>
				<p className="text-xs text-[var(--muted)] hidden sm:block">
					Оперативный контроль смет, возвращаемости и защита от отвала пациентов
				</p>
			</div>

			{/* Actions toolbar: 1 Primary CTA ("Новый план"), secondary actions */}
			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
				{/* Drop-out prevention button */}
				<button
					type="button"
					onClick={onRunDropoutPrevention}
					disabled={isRunningDropout}
					className={`h-9 min-h-[36px] px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
						dropoutRiskCount > 0
							? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
							: "bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--text)] border-[var(--line)]"
					}`}
					title="Проверить зависшие планы (>14 дней без записи) и создать задачи на звонок куратора"
					data-testid="pipeline-dropout-prevention-btn"
				>
					<ShieldAlert className={`w-3.5 h-3.5 ${isRunningDropout ? "animate-spin text-amber-500" : "text-amber-500"}`} />
					<span className="hidden sm:inline">Анти-отвал (14–21д)</span>
					{dropoutRiskCount > 0 && (
						<span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-white font-bold leading-none">
							{dropoutRiskCount}
						</span>
					)}
				</button>

				{/* Mandate 8am: Single Primary CTA in the visible context */}
				<a
					href="#/patients"
					className="primary-button h-9 min-h-[36px] px-3 sm:px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
					style={{ borderRadius: "10px" }}
					title="Перейти к пациентам для составления нового плана"
					data-testid="pipeline-new-plan-btn"
				>
					<Plus className="w-3.5 h-3.5" />
					<span className="hidden xs:inline sm:inline">Новый план</span>
					<span className="inline xs:hidden sm:hidden">План</span>
				</a>

				{/* Desktop View Mode Switcher (Horizontal Swimlanes vs Kanban Columns) */}
				<div className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] shadow-xs">
					<button
						type="button"
						onClick={() => onViewModeChange("horizontal")}
						className="h-8 px-3.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
						style={{
							backgroundColor: viewMode === "horizontal" ? "var(--teal, #0d9488)" : "transparent",
							color: viewMode === "horizontal" ? "#ffffff" : "var(--muted)",
							padding: "0 14px",
							height: "32px",
							borderRadius: "8px",
						}}
						title="Горизонтальный режим дорожек (просторные карточки)"
						data-testid="pipeline-view-mode-horizontal"
					>
						<List className="w-3.5 h-3.5 shrink-0" />
						<span>Горизонтальный</span>
					</button>
					<button
						type="button"
						onClick={() => onViewModeChange("kanban")}
						className="h-8 px-3.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
						style={{
							backgroundColor: viewMode === "kanban" ? "var(--teal, #0d9488)" : "transparent",
							color: viewMode === "kanban" ? "#ffffff" : "var(--muted)",
							padding: "0 14px",
							height: "32px",
							borderRadius: "8px",
						}}
						title="Режим колонок (Канбан)"
						data-testid="pipeline-view-mode-kanban"
					>
						<Columns className="w-3.5 h-3.5 shrink-0" />
						<span>Колонки</span>
					</button>
				</div>

				{/* Refresh Button (Desktop only, mobile uses floating bottom bar) */}
				<button
					type="button"
					onClick={onRefresh}
					disabled={isLoading}
					aria-label="Обновить воронку"
					title="Обновить воронку"
					className="hidden md:flex h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-medium transition items-center gap-1.5 shadow-sm cursor-pointer"
					style={{
						padding: "0 14px",
						height: "36px",
						borderRadius: "10px",
					}}
					data-testid="pipeline-refresh-btn"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
					<span className="hidden sm:inline">Обновить</span>
				</button>
			</div>
		</div>
	);
};
