import React from "react";
import { Calendar, ChevronDown, ChevronUp, Clock, Layers } from "lucide-react";
import type { TreatmentPlanStage } from "../../types";

export interface StageAccordionHeaderProps {
	readonly stage: TreatmentPlanStage;
	readonly isExpanded: boolean;
	readonly onToggle: () => void;
	readonly handleStageBooking: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly handleOpenLabOrder: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly isStageProsthetic: (stage: TreatmentPlanStage) => boolean;
}

export const StageAccordionHeader: React.FC<StageAccordionHeaderProps> = ({
	stage,
	isExpanded,
	onToggle,
	handleStageBooking,
	handleOpenLabOrder,
	isStageProsthetic,
}) => {
	return (
		<div
			onClick={onToggle}
			className="treatment-stage-header"
			data-testid={"stage-toggle-" + stage.stageNumber}
		>
			<div className="treatment-stage-title-wrap min-w-0 flex-1">
				<div className="treatment-stage-num-badge shrink-0">{stage.stageNumber}</div>
				<div className="min-w-0 flex-1">
					<h5 className="treatment-stage-name truncate">{stage.title}</h5>
					<p className="treatment-stage-subtitle truncate">{stage.subtitle}</p>
				</div>
			</div>

			<div className="treatment-stage-right-meta shrink-0 flex items-center gap-2">
				<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						onClick={(e) => handleStageBooking(stage, e)}
						className="min-h-[36px] sm:min-h-[28px] sm:h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 border border-teal-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
						title={`Записать Этап ${stage.stageNumber} в расписание визитов`}
						data-testid={`stage-book-btn-${stage.stageNumber}`}
					>
						<Calendar size={13} />
						<span>{stage.stageNumber === 1 ? "Записать 1-й этап" : "В расписание"}</span>
					</button>
					{isStageProsthetic(stage) && (
						<button
							type="button"
							onClick={(e) => handleOpenLabOrder(stage, e)}
							className="min-h-[36px] sm:min-h-[28px] sm:h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
							title={`Создать заказ-наряд в зуботехническую лабораторию для Этапа ${stage.stageNumber}`}
							data-testid={`stage-lab-order-btn-${stage.stageNumber}`}
						>
							<Layers size={13} />
							<span>Заказ ЗТЛ</span>
						</button>
					)}
				</div>

				<div className="treatment-stage-pill hidden sm:flex">
					<Clock size={13} />
					<span>{stage.estimatedWeeks} нед. ({stage.estimatedVisits} виз.)</span>
				</div>
				<div className="treatment-stage-total-badge font-mono">
					{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
				</div>
				<div className="text-[var(--tp-text-muted)]">
					{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</div>
			</div>
		</div>
	);
};
