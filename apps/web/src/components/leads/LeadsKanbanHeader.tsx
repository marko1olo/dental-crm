/**
 * DENTE Dental CRM — Leads Kanban Header & Filter Controls
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import type React from "react";
import { BarChart3, Filter, Plus, RotateCcw, Search } from "lucide-react";

export interface LeadsKanbanHeaderProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	sourceFilter: string;
	setSourceFilter: (val: string) => void;
	uniqueSources: string[];
	viewMode: "funnel" | "all";
	setViewMode: (val: "funnel" | "all") => void;
	secondaryLeadsCount?: number;
	onNewLead: () => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
	borderColor?: string;
	colBg?: string;
}

export const LeadsKanbanHeader: React.FC<LeadsKanbanHeaderProps> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
	viewMode,
	setViewMode,
	secondaryLeadsCount = 0,
	onNewLead,
	onOpenAnalytics,
	onOpenLeakDetector,
	borderColor = "var(--line)",
	colBg = "var(--paper-soft)",
}) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				marginBottom: 20,
				flexWrap: "wrap",
				gap: 12,
			}}
		>
			<div className="flex items-center gap-2.5 flex-wrap">
				<h2 className="m-0 text-xl font-semibold text-[var(--ink)] flex items-center gap-2">
					Воронка Пациентов
					<span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--teal)] text-white rounded-full uppercase tracking-wider">
						PRO
					</span>
				</h2>

				{/* Segmented Funnel / All stages selector */}
				<div
					className="leads-viewmode-segmented"
					role="tablist"
					aria-label="Выбор отображения этапов воронки"
				>
					<button
						type="button"
						role="tab"
						aria-selected={viewMode === "funnel"}
						className={`leads-viewmode-segmented-btn ${viewMode === "funnel" ? "is-active" : ""}`}
						onClick={() => setViewMode("funnel")}
						data-testid="leads-viewmode-funnel-btn"
						title="Показать 4 ключевых этапа воронки пациентов"
					>
						<span>Воронка (4)</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={viewMode === "all"}
						className={`leads-viewmode-segmented-btn ${viewMode === "all" ? "is-active" : ""}`}
						onClick={() => setViewMode("all")}
						data-testid="leads-viewmode-all-btn"
						title="Показать все 6 колонок включая недозвоны и отказы"
					>
						<span>Все этапы (6)</span>
						{secondaryLeadsCount > 0 && (
							<span className="leads-viewmode-badge">
								{secondaryLeadsCount}
							</span>
						)}
					</button>
				</div>

				<button
					className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onNewLead}
					type="button"
					aria-label="Создать новый лид"
				>
					<Plus size={15} /> Новый лид
				</button>
				<button
					className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onOpenAnalytics}
					type="button"
					aria-label="Открыть сквозную аналитику воронки"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 5,
						fontWeight: 600,
					}}
				>
					<BarChart3 size={15} color="var(--teal)" /> Аналитика воронки
				</button>
				<button
					className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onOpenLeakDetector}
					type="button"
					aria-label="Открыть детектор оттока пациентов (210 дней)"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 5,
						fontWeight: 600,
					}}
				>
					<RotateCcw size={15} color="var(--teal)" /> Детектор оттока
				</button>
			</div>

			<div className="flex items-center gap-2.5">
				<div className="relative">
					<Search
						size={15}
						className="text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
					/>
					<input
						type="text"
						placeholder="Поиск по имени или телефону..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="!pl-9 pr-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all w-56"
						aria-label="Поиск по имени или телефону"
					/>
				</div>
				<div style={{ position: "relative" }}>
					<Filter
						size={15}
						color="var(--muted)"
						style={{ position: "absolute", left: 10, top: 9 }}
					/>
					<select
						value={sourceFilter}
						onChange={(e) => setSourceFilter(e.target.value)}
						style={{
							padding: "6px 12px 6px 32px",
							borderRadius: 8,
							border: `1px solid ${borderColor}`,
							background: colBg,
							color: "var(--ink)",
							appearance: "none",
							minWidth: 130,
							fontSize: 12,
						}}
					>
						<option value="">Все источники</option>
						{uniqueSources.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
