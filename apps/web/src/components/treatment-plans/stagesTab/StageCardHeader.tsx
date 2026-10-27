import type React from "react";
import { CalendarPlus, CreditCard, FlaskConical, Receipt } from "lucide-react";
import type { TreatmentPlanStage } from "../types.js";

interface StageCardHeaderProps {
	readonly stage: TreatmentPlanStage;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly onSendStage: (stage: TreatmentPlanStage, target: "visit" | "invoice") => void;
	readonly onPayStage: (stage: TreatmentPlanStage) => void;
}

export const StageCardHeader: React.FC<StageCardHeaderProps> = ({
	stage,
	patientId,
	patientName,
	onSendStage,
	onPayStage,
}) => {
	const handleOpenLab = () => {
		const targetTooth = stage.items.find((i) => i.toothNumber)?.toothNumber || 16;
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-open-create-lab-order", {
					detail: {
						patientId,
						patientName,
						toothNumber: String(targetTooth),
						toothFdi: targetTooth,
						workType: stage.title || "Ортопедическая конструкция",
						stageNumber: stage.stageNumber,
						stageTitle: stage.title,
					},
				}),
			);
		}
	};

	return (
		<div className="flex items-center justify-between pb-3 border-b border-[var(--tp-border)] mb-3 flex-wrap gap-2">
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<div className="treatment-stage-num-badge shrink-0">{stage.stageNumber}</div>
				<div className="min-w-0 flex-1">
					<h4 className="text-sm font-black text-[var(--tp-text-main)] m-0 truncate">{stage.title}</h4>
					<p className="text-xs text-[var(--tp-text-muted)] m-0 truncate">{stage.clinicalGoal}</p>
				</div>
			</div>

			<div className="flex items-center gap-3 shrink-0">
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => onSendStage(stage, "visit")}
						className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft,var(--tp-surface-soft))] hover:bg-[var(--paper,var(--tp-surface))] border border-[var(--line-subtle,var(--tp-border))] text-[var(--ink,var(--tp-text-main))] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`stage-send-to-visit-btn-${stage.stageNumber}`}
						title="Перенести услуги этапа в текущий приём врача"
					>
						<CalendarPlus size={13} className="text-[var(--teal,var(--tp-primary))]" />
						<span>В приём</span>
					</button>

					<button
						type="button"
						onClick={() => onSendStage(stage, "invoice")}
						className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--teal-soft,rgba(20,184,166,0.1))] hover:bg-[var(--teal-soft-strong,rgba(20,184,166,0.2))] border border-[var(--teal,rgba(20,184,166,0.3))] text-[var(--teal-dark,var(--teal))] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`stage-send-to-invoice-btn-${stage.stageNumber}`}
						title="Перенести услуги этапа в кассовый счёт на оплату"
					>
						<Receipt size={13} className="text-[var(--teal,var(--tp-primary))]" />
						<span>В счёт визита</span>
					</button>

					<button
						type="button"
						onClick={() => onPayStage(stage)}
						className="h-8 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`stage-pay-btn-${stage.stageNumber}`}
						title="Оплатить этап в кассе (наличные, терминал, СБП)"
					>
						<CreditCard size={13} className="text-white shrink-0" />
						<span>Оплатить этап</span>
					</button>

					<button
						type="button"
						onClick={handleOpenLab}
						className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`stage-create-lab-order-btn-${stage.stageNumber}`}
						title="Создать наряд в зуботехническую лабораторию (ЗТЛ)"
					>
						<FlaskConical size={13} className="text-amber-600 dark:text-amber-400" />
						<span>Наряд ЗТЛ</span>
					</button>
				</div>

				<div className="text-right">
					<div className="text-sm font-black text-[var(--tp-text-main)] font-mono">
						{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--tp-text-muted)]">
						{stage.estimatedWeeks} нед. · {stage.estimatedVisits} визитов
					</div>
				</div>
			</div>
		</div>
	);
};
