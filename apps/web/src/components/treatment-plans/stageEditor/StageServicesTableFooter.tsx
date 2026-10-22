import React from "react";
import { CreditCard, Play, Plus } from "lucide-react";
import type { TreatmentPlanStage } from "../types";

export interface StageServicesTableFooterProps {
	readonly stage: TreatmentPlanStage;
	readonly onAddItemToStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageServicesTableFooter: React.FC<StageServicesTableFooterProps> = ({
	stage,
	onAddItemToStage,
	onStartStage,
	onPayStage,
}) => {
	const totalItems = stage.items.reduce((sum, it) => sum + (it.quantity || 1), 0);

	return (
		<div className="stage-table-footer" data-testid="stage-services-table-footer">
			<div className="stage-table-footer-left">
				{onAddItemToStage && (
					<button
						type="button"
						onClick={() => onAddItemToStage(stage)}
						className="stage-footer-add-btn"
						data-testid="stage-footer-add-item-btn"
					>
						<Plus size={13} />
						<span>Поиск по каталогу...</span>
					</button>
				)}
				<span className="stage-footer-items-count">
					Позиций в этапе: <strong>{stage.items.length}</strong> (всего услуг: <strong>{totalItems}</strong>)
				</span>
			</div>

			<div className="stage-table-footer-right">
				<div className="stage-footer-total-wrap">
					<span className="stage-footer-total-label">Стоимость этапа:</span>
					<span className="stage-footer-total-sum font-mono">
						{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
					</span>
				</div>

				{onStartStage && stage.status !== "in_progress" && stage.status !== "completed" && (
					<button
						type="button"
						onClick={() => onStartStage(stage)}
						className="stage-footer-start-btn"
						title="Перевести этап в работу"
						data-testid="stage-footer-start-btn"
					>
						<Play size={12} />
						<span>Начать</span>
					</button>
				)}

				{onPayStage && (
					<button
						type="button"
						onClick={() => onPayStage(stage)}
						className="stage-footer-pay-btn"
						title="Передать этап в кассу для оплаты"
						data-testid="stage-footer-pay-btn"
					>
						<CreditCard size={13} />
						<span>Оплатить этап</span>
					</button>
				)}
			</div>
		</div>
	);
};
