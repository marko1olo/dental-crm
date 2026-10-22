import React from "react";
import { Check, RotateCcw, ShieldAlert } from "lucide-react";
import { EndoFileCanal } from "../../icons/DentalIcons";

export interface ToothEndoPresetsBarProps {
	onApplyProTaper: () => void;
	onApplyCalasept: () => void;
	onApplyRevision: () => void;
	onApplyObturation: () => void;
}

export const ToothEndoPresetsBar: React.FC<ToothEndoPresetsBarProps> = ({
	onApplyProTaper,
	onApplyCalasept,
	onApplyRevision,
	onApplyObturation,
}) => {
	return (
		<div className="dente-endo-presets-bar" data-testid="endo-presets-bar">
			<div className="dente-endo-presets-label-row">
				<span className="dente-endo-presets-title">
					<EndoFileCanal size={14} />
					<span>Клинические протоколы эндодонтии:</span>
				</span>
			</div>
			<div className="dente-endo-presets-actions min-w-0">
				<button
					type="button"
					onClick={onApplyProTaper}
					className="dente-endo-preset-btn protaper"
					title="Заполнить все каналы: ProTaper Gold 25.06, NaOCl 3% + EDTA, обтурация AH Plus + гуттаперча"
					data-testid="endo-preset-protaper"
				>
					<EndoFileCanal size={14} className="shrink-0" />
					<span className="truncate min-w-0">Экспресс ProTaper: 25.06 + NaOCl + AH Plus</span>
				</button>
				<button
					type="button"
					onClick={onApplyCalasept}
					className="dente-endo-preset-btn calasept"
					title="Временная лечебная повязка гидроксидом кальция Ca(OH)2 при деструктивных периодонтитах"
					data-testid="endo-preset-calasept"
				>
					<ShieldAlert size={14} className="shrink-0" />
					<span className="truncate min-w-0">Временная обтурация: Каласепт (Ca(OH)2)</span>
				</button>
				<button
					type="button"
					onClick={onApplyRevision}
					className="dente-endo-preset-btn revision"
					title="Распломбировка каналов ProTaper Retreatment D1-D3 с сольвентом"
					data-testid="endo-preset-revision"
				>
					<RotateCcw size={14} className="shrink-0" />
					<span className="truncate min-w-0">Распломбировка / Ревизия (D1-D3, Сольвент)</span>
				</button>
				<button
					type="button"
					onClick={onApplyObturation}
					className="dente-endo-preset-btn obturation"
					title="Постоянная обтурация каналов гуттаперчей до апекса (AH Plus)"
					data-testid="endo-preset-obturation"
				>
					<Check size={14} className="shrink-0" />
					<span className="truncate min-w-0">Обтурация до апекса (AH Plus)</span>
				</button>
			</div>
		</div>
	);
};
