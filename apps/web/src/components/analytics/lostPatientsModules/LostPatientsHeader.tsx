import React from "react";
import { HeartHandshake, RefreshCw } from "lucide-react";
import type { TabMode } from "./lostPatientTypes";

interface LostPatientsHeaderProps {
	readonly totalPatientsCount: number;
	readonly filteredPatientsCount: number;
	readonly activeTab: TabMode;
	readonly onTabChange: (tab: TabMode) => void;
	readonly loading: boolean;
	readonly onRefresh: () => void;
}

export function LostPatientsHeader({
	totalPatientsCount,
	filteredPatientsCount,
	activeTab,
	onTabChange,
	loading,
	onRefresh,
}: LostPatientsHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--line)]">
			<div className="flex items-center gap-3">
				<div className="p-2 rounded-lg bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)]">
					<HeartHandshake className="w-5 h-5" />
				</div>
				<div>
					<h3 style={{ color: "var(--ink)" }} className="font-bold text-base leading-tight flex items-center gap-2">
						<span style={{ color: "var(--ink)" }}>Удержание пациентов и профилактика оттока</span>
						<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
							{totalPatientsCount}
						</span>
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Когортный анализ возвращаемости (Recall 6/12м), выявление зоны риска и реактивация пациентов
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "risk_list"}
						onClick={() => onTabChange("risk_list")}
						className={`dente-segmented-item ${activeTab === "risk_list" ? "active" : ""}`}
						data-active={activeTab === "risk_list"}
					>
						Зона риска ({filteredPatientsCount})
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "recall_cohorts"}
						onClick={() => onTabChange("recall_cohorts")}
						className={`dente-segmented-item ${activeTab === "recall_cohorts" ? "active" : ""}`}
						data-active={activeTab === "recall_cohorts"}
					>
						Когорты Recall 6/12м
					</button>
				</div>

				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className="secondary-button h-8 w-8 min-h-[32px] min-w-[32px] p-0 rounded-lg inline-flex items-center justify-center cursor-pointer shadow-xs"
					title="Обновить аналитику"
					aria-label="Обновить аналитику"
					data-testid="lost-patients-refresh-btn"
				>
					<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--teal)]" : ""}`} />
				</button>
			</div>
		</div>
	);
}
