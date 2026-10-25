import React from "react";
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, QrCode, Sparkles } from "lucide-react";
import type { TreatmentPlanStage } from "../../patientCabinetEngine.js";
import { formatRubles } from "../../patientCabinetEngine.js";

interface TreatmentPlanStageCardProps {
	readonly stage: TreatmentPlanStage;
	readonly idx: number;
	readonly isExpanded: boolean;
	readonly onToggle: () => void;
	readonly onPayStageWithSbp: (stage: TreatmentPlanStage) => void;
	readonly onBookAppointment: () => void;
}

export const TreatmentPlanStageCard: React.FC<TreatmentPlanStageCardProps> = ({
	stage, idx, isExpanded, onToggle, onPayStageWithSbp, onBookAppointment,
}) => {
	const isCompleted = stage.status === "completed";
	const isInProgress = stage.status === "in_progress";
	const stageKey = stage.id || `stage-${idx}`;

	return (
		<div className={`pc-stage-card ${isCompleted ? "completed" : isInProgress ? "in-progress" : "pending"}`} data-testid={`treatment-stage-card-${stageKey}`}>
			<div className="pc-stage-header" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(); }}>
				<div className="pc-stage-badge-number">
					{isCompleted ? <CheckCircle2 size={20} className="pc-icon-success" /> : <span>{stage.orderIndex || idx + 1}</span>}
				</div>
				<div className="pc-stage-title-col">
					<div className="pc-stage-title-line">
						<strong className="pc-stage-title">{stage.titleRu}</strong>
						<span className={`pc-status-badge ${isCompleted ? "paid" : isInProgress ? "scheduled" : "unpaid"}`}>
							{isCompleted ? "Выполнен" : isInProgress ? "В процессе" : "Запланирован"}
						</span>
					</div>
					<div className="pc-stage-meta-line">
						{stage.teethFdi && stage.teethFdi.length > 0 && <span className="pc-stage-teeth">Зубы: <strong>{stage.teethFdi.join(", ")}</strong></span>}
						{stage.estimatedVisitsCount && <span className="pc-stage-visits">&bull; Визитов: {stage.estimatedVisitsCount}</span>}
					</div>
				</div>
				<div className="pc-stage-price-col">
					<span className="pc-stage-cost">{formatRubles(stage.costRub)}</span>
					<button type="button" className="pc-stage-chevron-btn" aria-label={isExpanded ? "Свернуть" : "Развернуть"} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
						{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="pc-stage-body">
					<div className="pc-stage-included-pill">
						<Sparkles size={14} className="pc-icon-primary" />
						<span>Всё включено: анестезия 0 ₽, снимки 0 ₽, изоляция коффердамом 0 ₽</span>
					</div>
					<div className="pc-stage-procedures-list">
						<span className="pc-proc-list-header">Процедуры этапа:</span>
						{stage.procedures.map((proc, pIdx) => (
							<div key={pIdx} className="pc-proc-item"><CheckCircle2 size={14} className="pc-icon-primary" /><span>{proc}</span></div>
						))}
					</div>
					<div className="pc-stage-actions">
						{!isCompleted && (
							<button type="button" className="pc-btn-primary pc-stage-pay-btn" onClick={() => onPayStageWithSbp(stage)} data-testid={`pay-stage-btn-${stageKey}`}>
								<QrCode size={16} /><span>Оплатить этап через СБП ({formatRubles(stage.costRub)})</span>
							</button>
						)}
						<button type="button" className="pc-btn-secondary pc-stage-book-btn" onClick={onBookAppointment}>
							<Calendar size={16} /><span>Записаться на этот этап</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
