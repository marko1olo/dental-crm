/**
 * apps/web/src/components/visit/VisitPlanStageHandoffBanner.tsx
 * DENTE Dental CRM — Targeted Treatment Plan Stage Handoff Cockpit Strip.
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */

import React from "react";
import { CheckCircle2, Clock, FlaskConical, ShieldCheck } from "lucide-react";
import { useVisitPlanStageHandoff } from "./useVisitPlanStageHandoff";
import { VisitPlanStageHandoffChips } from "./VisitPlanStageHandoffChips";
import { VisitPlanStageHandoffItemsPreview } from "./VisitPlanStageHandoffItemsPreview";

export interface VisitPlanStageHandoffBannerProps {
	readonly loadedTreatmentPlan: any;
	readonly activeAppointment?: any | null | undefined;
	readonly activePatient?: any | null | undefined;
	readonly style?: React.CSSProperties | undefined;
	readonly onTakeStage?: ((stage: { title: string; stageNumber: number; items: any[] }, items: any[]) => void) | undefined;
	readonly onOpenLabOrder?: ((stage: { title: string; stageNumber: number; items: any[] }, items: any[]) => void) | undefined;
}

export function VisitPlanStageHandoffBanner(props: VisitPlanStageHandoffBannerProps) {
	const { loadedTreatmentPlan, style } = props;
	const h = useVisitPlanStageHandoff(props);

	if (!loadedTreatmentPlan || h.allPlanItems.length === 0) return null;

	return (
		<div
			data-testid="visit-treatment-plan-handoff-banner"
			className="my-2 p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/30 dark:border-teal-500/30 flex flex-col gap-2.5 text-xs shadow-2xs overflow-x-clip max-w-full box-border"
			style={style}
		>
			{/* Top row: Status info + Primary action */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					<div className="p-1.5 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal-dark,#0f766e)] dark:text-teal-300 shrink-0 mt-0.5">
						<ShieldCheck size={18} />
					</div>

					<div className="flex flex-col min-w-0 gap-0.5">
						<div className="flex items-center gap-2 flex-wrap">
							{h.isTargetedFromAppointment ? (
								<span data-testid="handoff-stage-targeted-title" className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<span className="text-[var(--teal-dark,#0f766e)] dark:text-teal-300 font-semibold">Запись по этапу:</span>
									<span className="leading-snug break-words">{h.displayStageTitle}</span>
								</span>
							) : (
								<span className="font-bold text-xs text-[var(--ink,#0f172a)] leading-snug break-words">
									План лечения: {loadedTreatmentPlan.name}
								</span>
							)}

							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal-dark,#0f766e)] dark:text-teal-300 border border-[var(--teal,#0d9488)]/30">
								{loadedTreatmentPlan.status === "Approved" ? "Согласован" : loadedTreatmentPlan.status === "Active" ? "В работе" : "Черновик"}
							</span>

							{h.appointmentStageTarget.durationMinutes && h.isTargetedFromAppointment && (
								<span data-testid="handoff-stage-duration-badge" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] flex items-center gap-1">
									<Clock size={11} />
									<span>{h.appointmentStageTarget.durationMinutes} мин</span>
								</span>
							)}
						</div>

						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)] flex-wrap">
							<span>{h.selectedItems.length} {h.selectedItems.length === 1 ? "услуга" : h.selectedItems.length < 5 ? "услуги" : "услуг"}</span>
							<span>•</span>
							<span className="font-semibold text-[var(--ink,#0f172a)]">{Number(h.selectedTotalRub || 0).toLocaleString("ru-RU")} ₽</span>
							{h.hasMultipleStages && h.selectedStageKey !== "all" && (
								<>
									<span className="text-[var(--muted,#94a3b8)]">/ из общего плана:</span>
									<span className="text-[var(--muted,#64748b)]">{Number(h.totalPlanPriceRub || 0).toLocaleString("ru-RU")} ₽</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Action CTA buttons */}
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						data-testid="take-stage-to-visit-btn"
						onClick={h.handleExecuteTakeStage}
						className="primary-button min-h-[44px] h-11 flex-1 sm:flex-none px-4 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-95 shrink-0"
						title="Перенести выбранный этап плана лечения в текущий визит и счет"
					>
						<CheckCircle2 size={16} />
						<span>{typeof h.selectedStageKey === "number" ? `Взять Этап ${h.selectedStageKey} в работу визита` : "Взять этап в работу визита"}</span>
					</button>

					<button
						type="button"
						data-testid="handoff-stage-lab-order-btn"
						onClick={h.handleOpenLabOrderForStage}
						className="secondary-button min-h-[44px] h-11 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 shrink-0 border border-[var(--teal,#0d9488)]/40 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--teal-dark,#0f766e)] dark:text-teal-300 hover:bg-[var(--teal,#0d9488)]/10"
						title="Сформировать наряд-заказ в зуботехническую лабораторию (ЗТЛ) по данному этапу"
					>
						<FlaskConical size={15} />
						<span>Заказ в ЗТЛ</span>
					</button>
				</div>
			</div>

			{/* Stage Selector Chips */}
			{h.hasMultipleStages && (
				<VisitPlanStageHandoffChips
					stages={h.stages}
					allPlanItemsCount={h.allPlanItems.length}
					selectedStageKey={h.selectedStageKey}
					onSelectStageKey={h.setSelectedStageKey}
				/>
			)}

			{/* Compact preview of procedures */}
			<VisitPlanStageHandoffItemsPreview selectedItems={h.selectedItems} />
		</div>
	);
}
