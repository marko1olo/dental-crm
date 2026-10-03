/**
 * apps/web/src/components/patients/TreatmentPlansList.tsx
 *
 * DENTE Dental CRM — Структурированный реестр планов лечения пациента.
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ ЭРГОНОМИКИ:
 * 1. Защита согласий и сметы по ПП РФ №659 и ст. 16 ЗоЗПП (фиксация согласованных позиций).
 * 2. Быстрые фильтры по статусу (Все, В работе, Запланировано, Выполнено).
 * 3. Финансовая сводка по смете: Общий бюджет, Согласовано, Выполнено.
 * 4. Защита от сдвига макета (CLS = 0).
 * 5. Строго векторные иконки Lucide, 0 эмодзи.
 */

import React, { useMemo, useState, useCallback } from "react";
import type { TreatmentPlanItem } from "@dental/shared";
import {
	CheckCircle2,
	Clock,
	DollarSign,
	FileText,
	Filter,
	Layers,
	Plus,
	Search,
	Shield,
	Stethoscope,
	X,
} from "lucide-react";
import { money } from "../../utils/financeUtils";
import { TreatmentPlanCardItem } from "./TreatmentPlanCardItem";

export type TreatmentPlanStatusFilter = "all" | "in_progress" | "approved" | "proposed" | "completed";

export interface TreatmentPlansListProps {
	readonly items: readonly TreatmentPlanItem[];
	readonly onOpenPlan?: ((planId: string) => void) | undefined;
	readonly onNewPlanItem?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlansList: React.FC<TreatmentPlansListProps> = React.memo(
	function TreatmentPlansList({
		items,
		onOpenPlan,
		onNewPlanItem,
		className = "",
	}) {
		const [statusFilter, setStatusFilter] = useState<TreatmentPlanStatusFilter>("all");
		const [searchQuery, setSearchQuery] = useState<string>("");

		// Filter items
		const filteredItems = useMemo(() => {
			const query = searchQuery.trim().toLowerCase();
			return items.filter((item) => {
				if (statusFilter !== "all" && item.status !== statusFilter) {
					return false;
				}

				if (query) {
					const nameMatch = (item.snapshotServiceName || "").toLowerCase().includes(query);
					const toothMatch = item.toothCode ? String(item.toothCode).toLowerCase().includes(query) : false;
					if (!nameMatch && !toothMatch) return false;
				}

				return true;
			});
		}, [items, statusFilter, searchQuery]);

		// Financial summary metrics
		const summary = useMemo(() => {
			let totalRub = 0;
			let completedRub = 0;
			let pendingRub = 0;

			for (const it of items) {
				const cost = Math.max(0, (it.unitPriceRub || 0) - (it.discountRub || 0));
				totalRub += cost;
				if (it.status === "completed") {
					completedRub += cost;
				} else if (it.status === "in_progress" || it.status === "approved" || it.status === "proposed") {
					pendingRub += cost;
				}
			}

			return { totalRub, completedRub, pendingRub };
		}, [items]);

		return (
			<div
				className={`treatment-plans-list-container flex flex-col gap-3 w-full text-[var(--ink)] ${className}`}
				data-testid="treatment-plans-list"
			>
				{/* 1. Header Toolbar with Filter Chips and Search */}
				<div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
					{/* Status Filters */}
					<div className="flex items-center gap-1.5 flex-wrap" data-testid="plans-status-filters">
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
								statusFilter === "all"
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-plans-all"
						>
							Все ({items.length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("in_progress")}
							className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
								statusFilter === "in_progress"
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-plans-in-progress"
						>
							В работе ({items.filter((i) => i.status === "in_progress").length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("approved")}
							className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
								statusFilter === "approved"
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-plans-approved"
						>
							Согласовано ({items.filter((i) => i.status === "approved").length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("proposed")}
							className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
								statusFilter === "proposed"
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-plans-proposed"
						>
							Предложено ({items.filter((i) => i.status === "proposed").length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("completed")}
							className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
								statusFilter === "completed"
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-plans-completed"
						>
							Выполнено ({items.filter((i) => i.status === "completed").length})
						</button>
					</div>

					{/* Search & Actions */}
					<div className="flex items-center gap-2 flex-1 max-w-sm min-w-[200px] justify-end">
						<div className="relative w-full">
							<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по услуге или зубу..."
								className="w-full h-7 pl-8 pr-7 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
								data-testid="plans-search-input"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0.5 bg-transparent border-0"
									title="Очистить"
								>
									<X className="w-3 h-3" />
								</button>
							)}
						</div>

						{onNewPlanItem && (
							<button
								type="button"
								onClick={onNewPlanItem}
								className="min-h-[30px] h-7 px-2.5 text-xs font-bold rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 shadow-xs"
								data-testid="btn-add-plan-position"
							>
								<Plus className="w-3 h-3" />
								<span>Добавить</span>
							</button>
						)}
					</div>
				</div>

				{/* 2. Financial Metrics Bar */}
				{items.length > 0 && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
								Общий бюджет плана:
							</span>
							<span className="text-xs font-mono font-black text-[var(--ink)]">
								{money(summary.totalRub)}
							</span>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
								Выполнено:
							</span>
							<span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
								{money(summary.completedRub)}
							</span>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
								Остаток к реализации:
							</span>
							<span className="text-xs font-mono font-black text-[var(--teal)]">
								{money(summary.pendingRub)}
							</span>
						</div>
					</div>
				)}

				{/* 3. Items Grid or Empty State */}
				{filteredItems.length === 0 ? (
					<div
						className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2"
						data-testid="plans-empty-state"
					>
						<Stethoscope className="w-8 h-8 opacity-40 text-[var(--muted)]" />
						<div className="font-bold text-[var(--ink)]">Позиции плана не найдены</div>
						<p className="max-w-md m-0">
							{searchQuery
								? `По запросу «${searchQuery}» позиций плана не найдено.`
								: "План лечения пациента пока пуст. Вы можете составить комплексный план из каталога услуг."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-testid="plans-items-grid">
						{filteredItems.map((item) => (
							<TreatmentPlanCardItem
								key={item.id}
								item={item}
								onOpenPlan={onOpenPlan}
							/>
						))}
					</div>
				)}
			</div>
		);
	},
);

TreatmentPlansList.displayName = "TreatmentPlansList";
