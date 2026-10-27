import React from "react";
import { FlaskConical, Printer, Bookmark, X } from "lucide-react";

export interface DentalLabOrderModalHeaderProps {
	patientName: string;
	patientChartNumber?: string | undefined;
	doctorName: string;
	treatmentPlanId?: string | undefined;
	stageNumber?: number | null | undefined;
	stageTitle?: string | undefined;
	onApplyDefaults: () => void;
	onPrint: () => void;
	onClose: () => void;
}

export function DentalLabOrderModalHeader({
	patientName,
	patientChartNumber,
	doctorName,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	onApplyDefaults,
	onPrint,
	onClose,
}: DentalLabOrderModalHeaderProps) {
	return (
		<div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-2">
			<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
				<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[var(--teal)] shrink-0">
					<FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center flex-wrap gap-1.5">
						<h2 id="dental-lab-modal-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
							Заказ в зуботехническую лабораторию
						</h2>
						<span className="whitespace-nowrap shrink-0 hidden sm:inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
							CAD/CAM Pro
						</span>
						{(treatmentPlanId || stageTitle || stageNumber != null) && (
							<span className="whitespace-nowrap shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30" data-testid="lab-order-treatment-stage-chip">
								Этап {stageNumber ?? 1} · {stageTitle || "Ортопедия"}
							</span>
						)}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5 truncate">
						Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>{patientChartNumber ? ` (${patientChartNumber})` : ""} · Врач: <strong className="text-[var(--ink)]">{doctorName}</strong>
					</p>
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<button type="button" onClick={onApplyDefaults} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink)] transition cursor-pointer shadow-2xs max-sm:!hidden" data-testid="lab-order-apply-defaults-btn">
					<Bookmark className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /><span>Шаблон (ZrO2 A2)</span>
				</button>
				<button type="button" onClick={onPrint} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink)] transition cursor-pointer shadow-2xs max-sm:!hidden">
					<Printer className="w-3.5 h-3.5 text-[var(--muted)]" /><span>Печать</span>
				</button>
				<button type="button" onClick={onClose} data-testid="lab-order-modal-close-btn" className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 rounded-xl flex items-center justify-center bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] hover:border-[var(--line)] transition cursor-pointer" aria-label="Закрыть">
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}
