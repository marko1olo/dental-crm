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
				marginBottom: 24,
				flexWrap: "wrap",
				gap: 16,
			}}
		>
			<div className="flex items-center gap-3">
				<h2 className="m-0 text-2xl font-semibold text-[var(--ink)] flex items-center gap-3">
					Воронка Пациентов
					<span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--teal)] text-[var(--paper)] rounded-full uppercase tracking-wider">
						PRO
					</span>
				</h2>
				<button
					className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onNewLead}
					type="button"
					aria-label="Создать новый лид"
				>
					<Plus size={16} /> Новый лид
				</button>
				<button
					className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onOpenAnalytics}
					type="button"
					aria-label="Открыть сквозную аналитику воронки"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontWeight: 600,
					}}
				>
					<BarChart3 size={16} color="var(--teal)" /> Аналитика воронки
				</button>
				<button
					className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					onClick={onOpenLeakDetector}
					type="button"
					aria-label="Открыть детектор оттока пациентов (210 дней)"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontWeight: 600,
					}}
				>
					<RotateCcw size={16} color="var(--teal)" /> Детектор оттока (210 дней)
				</button>
			</div>

			<div className="flex items-center gap-3">
				<div className="relative">
					<Search
						size={16}
						className="text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
					/>
					<input
						type="text"
						placeholder="Поиск по имени или телефону..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="!pl-10 pr-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all w-64"
						style={{ paddingLeft: "40px" }}
						aria-label="Поиск по имени или телефону"
					/>
				</div>
				<div style={{ position: "relative" }}>
					<Filter
						size={16}
						color="var(--muted)"
						style={{ position: "absolute", left: 10, top: 10 }}
					/>
					<select
						value={sourceFilter}
						onChange={(e) => setSourceFilter(e.target.value)}
						style={{
							padding: "8px 12px 8px 36px",
							borderRadius: 8,
							border: `1px solid ${borderColor}`,
							background: colBg,
							color: "var(--ink)",
							appearance: "none",
							minWidth: 140,
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
