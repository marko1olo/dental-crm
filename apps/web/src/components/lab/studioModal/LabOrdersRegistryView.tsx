/**
 * apps/web/src/components/lab/studioModal/LabOrdersRegistryView.tsx
 *
 * DENTE Dental CRM — Dental Lab Orders Registry & Filtering View.
 * Filter tabs, search by patient/tooth/lab, and list of orthopedic orders.
 * Mandate 8b modular design, Apple HIG grouped cards, Mandate 8am single CTA discipline.
 */

import React from "react";
import type { DentalLabOrderEntry } from "../dentalLabCatalogData";
import { LabStagesTimelineView } from "./LabStagesTimelineView";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";

export interface LabOrdersRegistryViewProps {
	readonly orders: DentalLabOrderEntry[];
	readonly activeFilter: LabFilterTab;
	readonly onSelectFilter: (filter: LabFilterTab) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly counts: {
		readonly all: number;
		readonly in_work: number;
		readonly in_clinic: number;
		readonly overdue: number;
	};
	readonly onAdvanceStage: (orderId: string) => void;
}

export const LabOrdersRegistryView: React.FC<LabOrdersRegistryViewProps> = ({
	orders,
	activeFilter,
	onSelectFilter,
	searchQuery,
	onSearchChange,
	counts,
	onAdvanceStage,
}) => {
	return (
		<section
			data-testid="lab-orders-registry-panel"
			className="col-span-1 lg:col-span-7 p-3.5 sm:p-4 flex flex-col gap-2.5 min-h-0 overflow-y-auto"
		>
			{/* Фильтры и поиск */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)] shrink-0">
				{/* Чипы фильтрации в стиле iOS Settings (Без слепящих белых пятен в Dark Mode) */}
				<div className="flex items-center gap-2 overflow-x-auto pb-1">
					<button
						type="button"
						data-testid="filter-tab-all"
						onClick={() => onSelectFilter("all")}
						className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
							activeFilter === "all"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
					>
						Все ({counts.all})
					</button>
					<button
						type="button"
						data-testid="filter-tab-in_work"
						onClick={() => onSelectFilter("in_work")}
						className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
							activeFilter === "in_work"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
					>
						В работе ({counts.in_work})
					</button>
					<button
						type="button"
						data-testid="filter-tab-in_clinic"
						onClick={() => onSelectFilter("in_clinic")}
						className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
							activeFilter === "in_clinic"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
					>
						В клинике ({counts.in_clinic})
					</button>
					<button
						type="button"
						data-testid="filter-tab-overdue"
						onClick={() => onSelectFilter("overdue")}
						className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
							activeFilter === "overdue"
								? "bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border-[var(--rose,#ef4444)] font-bold"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
					>
						Просрочены ({counts.overdue})
					</button>
				</div>

				{/* Поле поиска */}
				<div className="relative min-w-[160px] sm:w-48 shrink-0">
					<input
						type="text"
						data-testid="lab-orders-search-input"
						placeholder="Поиск по пациенту, зубу..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full text-xs bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] rounded-xl pl-3 pr-7 py-1.5 outline-none focus:border-[var(--teal)] placeholder:text-[var(--ink-muted)]"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="absolute right-2 top-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
							aria-label="Очистить поиск"
						>
							<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					)}
				</div>
			</div>

			{/* Список нарядов: Группированные карточки (Apple HIG & 44px touch targets) */}
			<div className="space-y-2.5 overflow-y-auto pr-0.5 flex-1 min-h-0">
				{orders.length === 0 ? (
					<div
						data-testid="empty-lab-orders-state"
						className="text-center py-12 border border-dashed border-[var(--line)] rounded-2xl bg-[var(--paper-soft)] text-[var(--ink-muted)] text-xs"
					>
						Нарядов в выбранной категории не обнаружено
					</div>
				) : (
					orders.map((ord) => (
						<LabStagesTimelineView
							key={ord.id}
							order={ord}
							onAdvanceStage={onAdvanceStage}
						/>
					))
				)}
			</div>
		</section>
	);
};

export default LabOrdersRegistryView;
