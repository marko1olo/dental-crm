import React from "react";
import { Plus, RotateCcw } from "lucide-react";
import { ApexLocator } from "../../icons/DentalIcons";

export interface ToothEndoControlsRowProps {
	onApplyAnatomicalLengths: () => void;
	onResetCanals: () => void;
	onAddCanal: () => void;
}

export const ToothEndoControlsRow: React.FC<ToothEndoControlsRowProps> = ({
	onApplyAnatomicalLengths,
	onResetCanals,
	onAddCanal,
}) => {
	return (
		<div className="dente-endo-controls-row">
			<button
				type="button"
				onClick={onApplyAnatomicalLengths}
				className="dente-secondary-btn"
				title="Автоматический расчет рабочей длины каналов по формуле FDI (мм)"
				data-testid="btn-endo-anatomical-lengths"
			>
				<ApexLocator size={14} className="shrink-0" />
				<span>Авто-длина по FDI</span>
			</button>

			<button
				type="button"
				onClick={onResetCanals}
				className="dente-secondary-btn"
				title="Сбросить к стандарту FDI"
			>
				<RotateCcw size={14} className="shrink-0" />
				<span>Анатомический стандарт FDI</span>
			</button>

			<button
				type="button"
				onClick={onAddCanal}
				className="dente-secondary-btn"
			>
				<Plus size={14} className="shrink-0" />
				<span>Добавить канал</span>
			</button>
		</div>
	);
};
