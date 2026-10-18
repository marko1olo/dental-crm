/**
 * DENTE CRM — Treatment Plan Presenter Tooth Inspection Card
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { X } from "lucide-react";
import type { ToothData } from "../../odontogram/ToothChart";
import { formatChairsidePrice } from "../treatmentPlanMath";
import { getToothRussianName, type PlanToothDetail } from "./treatmentPlanPresenterFormulaEngine";

export interface TreatmentPlanPresenterToothInspectionCardProps {
	readonly selectedTooth: number;
	readonly tierTitle: string;
	readonly initialToothData?: ToothData | undefined;
	readonly planInfo?: PlanToothDetail | undefined;
	readonly onClose: () => void;
}

export const TreatmentPlanPresenterToothInspectionCard: React.FC<TreatmentPlanPresenterToothInspectionCardProps> = memo(({
	selectedTooth,
	tierTitle,
	initialToothData,
	planInfo,
	onClose,
}) => {
	return (
		<div
			className="mt-3 p-3 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] animate-in fade-in duration-150 flex flex-col gap-2"
			data-testid="fdi-tooth-inspection-card"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--tp-border)]/60 pb-2">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="px-2 py-0.5 rounded-lg bg-[var(--tp-primary,#0d9488)] text-white font-mono font-bold text-xs">
						Зуб FDI {selectedTooth}
					</span>
					<span className="font-bold text-xs text-[var(--tp-text-main)]">
						{getToothRussianName(selectedTooth)}
					</span>
					{initialToothData?.state && (
						<span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
							Клинический диагноз: {initialToothData.state} {initialToothData.notes ? `(${initialToothData.notes})` : ""}
						</span>
					)}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded-md text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] hover:bg-[var(--tp-border)]/30 cursor-pointer"
					title="Закрыть информацию о зубе"
					data-testid="close-fdi-inspection-btn"
				>
					<X size={15} />
				</button>
			</div>

			{planInfo && planInfo.items.length > 0 ? (
				<div className="space-y-1.5">
					<div className="text-[11px] font-bold text-[var(--tp-text-muted)]">
						Запланированные манипуляции в тарифе «{tierTitle}»:
					</div>
					<div className="flex flex-col gap-1">
						{planInfo.items.map((it, idx) => (
							<div
								key={it.id || idx}
								className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--tp-surface)] border border-[var(--tp-border)]/40 text-xs"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<span className="px-1.5 py-0.5 rounded-sm bg-teal-600/15 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold shrink-0">
										Этап {it.stageNumber}
									</span>
									<span className="font-mono text-[11px] text-[var(--tp-text-muted)] shrink-0">
										{it.code804n}
									</span>
									<span className="font-medium text-[var(--tp-text-main)] truncate">
										{it.name}
									</span>
								</div>
								<div className="font-mono font-bold text-[var(--tp-text-main)] shrink-0">
									{formatChairsidePrice(it.priceRub)}
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="py-1 text-xs text-[var(--tp-text-muted)]">
					В варианте лечения «{tierTitle}» отдельные процедуры для зуба {selectedTooth} не предусмотрены.
				</div>
			)}
		</div>
	);
});

TreatmentPlanPresenterToothInspectionCard.displayName = "TreatmentPlanPresenterToothInspectionCard";
