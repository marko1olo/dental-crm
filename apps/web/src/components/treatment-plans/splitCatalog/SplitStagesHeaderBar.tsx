import React from "react";
import { Bot, Layers, Percent, Plus } from "lucide-react";
import { romanizeStageNumber } from "../types";
import type { SplitStagesHeaderBarProps } from "./splitCatalogTypes";

export const SplitStagesHeaderBar: React.FC<SplitStagesHeaderBarProps> = ({
	stages,
	activeStageNumber,
	onSelectActiveStage,
	onOpenCreateStageModal,
	onApplyDoctorDiscount,
	onExecuteCopilot,
	isCopilotExecuting = false,
	totalPlanRub,
}) => {
	return (
		<div className="split-stages-header-bar" data-testid="split-stages-header-bar">
			<div className="split-stages-tabs" role="tablist" aria-label="Этапы плана лечения">
				{stages.map((st) => {
					const isActive = st.stageNumber === activeStageNumber;
					return (
						<button
							key={st.stageNumber}
							type="button"
							onClick={() => onSelectActiveStage(st.stageNumber)}
							className={`split-stage-tab-btn ${isActive ? "active" : ""}`}
							data-testid={`split-stage-tab-${st.stageNumber}`}
						>
							<span className="split-stage-tab-num">{romanizeStageNumber(st.stageNumber)}</span>
							<span className="split-stage-tab-title">{st.title}</span>
							<span className="split-stage-tab-sum font-mono">
								{(st.totalRub || 0).toLocaleString("ru-RU")} ₽
							</span>
						</button>
					);
				})}
				<button
					type="button"
					onClick={onOpenCreateStageModal}
					className="split-add-stage-btn"
					data-testid="split-create-stage-btn"
					title="Создать новый этап плана"
				>
					<Plus size={13} />
					<span>+ Этап</span>
				</button>
			</div>

			<div className="split-stages-actions">
				{onExecuteCopilot && (
					<button
						type="button"
						onClick={onExecuteCopilot}
						disabled={isCopilotExecuting}
						className="split-copilot-btn"
						data-testid="split-copilot-btn"
						title="ИИ-ассистент сформирует оптимальные этапы по протоколам СтАР"
					>
						<Bot size={13} className="text-teal-600 dark:text-teal-400" />
						<span>{isCopilotExecuting ? "Генерация..." : "Заполнить с ИИ"}</span>
					</button>
				)}

				{onApplyDoctorDiscount && (
					<div className="split-discount-group">
						<Percent size={12} className="split-discount-icon" />
						{[0, 5, 10, 15, 20].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => onApplyDoctorDiscount(pct)}
								className="split-discount-chip"
								title={`Скидка врача ${pct}%`}
								data-testid={`split-discount-${pct}`}
							>
								{pct}%
							</button>
						))}
					</div>
				)}

				<div className="split-stages-total-plan font-mono">
					<span className="split-total-label">Весь план:</span>
					<span className="split-total-value font-bold">{totalPlanRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>
		</div>
	);
};
