import type { TreatmentPlanItem } from "@dental/shared";
import { FileText, Plus, Shield } from "lucide-react";
import React from "react";
import { TreatmentPlanCardItem } from "../TreatmentPlanCardItem";
import type { DomSliceResult } from "./types";

export interface PatientWorkspacePlansTabProps {
	patientPlanItems: TreatmentPlanItem[];
	patientAddendums: any[];
	plansSlice: DomSliceResult<TreatmentPlanItem>;
	pageSize: number;
	onShowMore: () => void;
	handleCreateNewPlanCallback: () => void;
	handleOpenPlanCallback: (planId: string) => void;
}

export const PatientWorkspacePlansTab: React.FC<PatientWorkspacePlansTabProps> = React.memo(
	({
		patientPlanItems,
		patientAddendums,
		plansSlice,
		pageSize,
		onShowMore,
		handleCreateNewPlanCallback,
		handleOpenPlanCallback,
	}) => {
		return (
			<div className="flex flex-col gap-2.5">
				{/* Decree 659 & Upsell Consent Shield Status Banner */}
				<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<Shield className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<div className="text-xs">
							<span className="font-bold text-[var(--ink)]">
								Защита согласий и плана лечения
							</span>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Все манипуляции фиксируются в плане. Новые позиции требуют
								Дополнительного соглашения.
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
							Активных ДС: {patientAddendums.length}
						</span>
						<button
							type="button"
							onClick={() => {
								window.location.hash = "#documents";
							}}
							className="min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 border-0 cursor-pointer inline-flex items-center gap-1"
						>
							<FileText className="w-3 h-3" />
							<span>Оформить ДС</span>
						</button>
					</div>
				</div>

				<div className="flex items-center justify-between flex-wrap gap-2">
					<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
						Позиции плана лечения ({patientPlanItems.length})
					</h4>
					<button
						type="button"
						onClick={handleCreateNewPlanCallback}
						className="min-h-[32px] px-3 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] hover:opacity-90 border-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
						data-testid="btn-create-treatment-plan"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Конструктор планов</span>
					</button>
				</div>
				{patientPlanItems.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-3">
						<p className="m-0">Планы лечения для пациента пока не составлены.</p>
						<button
							type="button"
							onClick={handleCreateNewPlanCallback}
							className="min-h-[34px] px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] hover:opacity-90 border-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
							data-testid="btn-empty-create-plan"
						>
							<Plus className="w-3.5 h-3.5" />
							<span>Создать первый план лечения</span>
						</button>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
							{(plansSlice?.visibleItems ?? []).map((item: any) => (
								<TreatmentPlanCardItem
									key={item.id}
									item={item}
									onOpenPlan={handleOpenPlanCallback}
								/>
							))}
						</div>
						{plansSlice.hasMore && (
							<div className="flex justify-center pt-1">
								<button
									type="button"
									onClick={onShowMore}
									className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
									data-testid="btn-patient-plans-show-more"
								>
									{`Показать ещё ${Math.min(pageSize, plansSlice.remainingCount)} поз. (показано ${plansSlice.displayedCount} из ${plansSlice.totalCount})`}
								</button>
							</div>
						)}
					</>
				)}
			</div>
		);
	},
);
PatientWorkspacePlansTab.displayName = "PatientWorkspacePlansTab";
