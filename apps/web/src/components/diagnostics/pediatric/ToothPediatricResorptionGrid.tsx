import React from "react";
import { Check, FileText } from "lucide-react";
import type { RootResorptionStage } from "../../odontogram/anatomicalGeometriesTypes";
import { RESORPTION_STAGES } from "./pediatricTypes";

export interface ToothPediatricResorptionGridProps {
	toothNumber: number;
	selectedResorption: RootResorptionStage | undefined;
	onResorptionChange: (stage: RootResorptionStage) => void;
	onInsertResorptionProtocol: () => void;
}

export const ToothPediatricResorptionGrid: React.FC<ToothPediatricResorptionGridProps> = ({
	toothNumber,
	selectedResorption,
	onResorptionChange,
	onInsertResorptionProtocol,
}) => {
	return (
		<div className="dente-resorption-box">
			<div className="dente-surface-label-row">
				<label className="dente-field-label mb-0">
					Физиологическая резорбция корней молочного зуба:
				</label>
				<button
					type="button"
					onClick={onInsertResorptionProtocol}
					className="dente-secondary-btn h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center"
					title={`Внести запись о резорбции корней зуба #${toothNumber} в карту`}
				>
					<FileText size={14} />
					<span>Внести в карту</span>
				</button>
			</div>
			<div className="dente-resorption-grid">
				{RESORPTION_STAGES.map((st) => {
					const isSelected = selectedResorption === st.stage;
					return (
						<button
							key={st.id}
							type="button"
							onClick={() => onResorptionChange(st.stage)}
							className={`dente-resorption-btn ${isSelected ? "selected" : ""}`}
						>
							<span className="resorption-title">{st.label}</span>
							<span className="resorption-sub">{st.sub}</span>
							{isSelected && <Check size={13} className="resorption-check" />}
						</button>
					);
				})}
			</div>
		</div>
	);
};
