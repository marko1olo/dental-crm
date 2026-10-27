import React, { useMemo, useState } from "react";
import { Plus, Stethoscope } from "lucide-react";
import { TreatmentPlanCardItem } from "./TreatmentPlanCardItem";
import type { TreatmentPlanStatusFilter, TreatmentPlansListProps } from "./plansList/treatmentPlansListTypes";
import { TreatmentPlansToolbar } from "./plansList/TreatmentPlansToolbar";
import { TreatmentPlansSummaryBar } from "./plansList/TreatmentPlansSummaryBar";

export type { TreatmentPlanStatusFilter, TreatmentPlansListProps } from "./plansList/treatmentPlansListTypes";

export const TreatmentPlansList: React.FC<TreatmentPlansListProps> = React.memo(
	function TreatmentPlansList({ items, onOpenPlan, onNewPlanItem, className = "" }) {
		const [statusFilter, setStatusFilter] = useState<TreatmentPlanStatusFilter>("all");
		const [searchQuery, setSearchQuery] = useState<string>("");

		const filteredItems = useMemo(() => {
			const query = searchQuery.trim().toLowerCase();
			return items.filter((item) => {
				if (statusFilter !== "all" && item.status !== statusFilter) return false;
				if (query) {
					const nameMatch = (item.snapshotServiceName || "").toLowerCase().includes(query);
					const toothMatch = item.toothCode ? String(item.toothCode).toLowerCase().includes(query) : false;
					if (!nameMatch && !toothMatch) return false;
				}
				return true;
			});
		}, [items, statusFilter, searchQuery]);

		const summary = useMemo(() => {
			let totalRub = 0;
			let completedRub = 0;
			let pendingRub = 0;
			for (const it of items) {
				const cost = Math.max(0, (it.unitPriceRub || 0) - (it.discountRub || 0));
				totalRub += cost;
				if (it.status === "completed") completedRub += cost;
				else if (it.status === "in_progress" || it.status === "approved" || it.status === "proposed") {
					pendingRub += cost;
				}
			}
			return { totalRub, completedRub, pendingRub };
		}, [items]);

		return (
			<div className={`treatment-plans-list-container flex flex-col gap-3 w-full text-[var(--ink)] ${className}`} data-testid="treatment-plans-list">
				<TreatmentPlansToolbar
					items={items}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					onNewPlanItem={onNewPlanItem}
				/>

				{items.length > 0 && (
					<TreatmentPlansSummaryBar
						totalRub={summary.totalRub}
						completedRub={summary.completedRub}
						pendingRub={summary.pendingRub}
					/>
				)}

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
						{!searchQuery && onNewPlanItem && (
							<button
								type="button"
								onClick={onNewPlanItem}
								className="primary-button h-9 px-4 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 mt-2"
								data-testid="btn-add-first-plan-position"
							>
								<Plus size={15} />
								<span>Добавить первую услугу в план</span>
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-testid="plans-items-grid">
						{filteredItems.map((item) => (
							<TreatmentPlanCardItem key={item.id} item={item} onOpenPlan={onOpenPlan} />
						))}
					</div>
				)}
			</div>
		);
	},
);

TreatmentPlansList.displayName = "TreatmentPlansList";
