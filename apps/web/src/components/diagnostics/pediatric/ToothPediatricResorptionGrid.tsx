import React from "react";
import { Check } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";
import type { RootResorptionStage } from "../../odontogram/anatomicalToothGeometries";
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
				<label className="dente-field-label" style={{ marginBottom: 0 }}>
					Физиологическая резорбция корней молочного зуба:
				</label>
				<button
					type="button"
					onClick={onInsertResorptionProtocol}
					className="dente-secondary-btn"
					style={{ minHeight: "32px", height: "32px", padding: "4px 10px", fontSize: "12px", gap: "6px" }}
					title={`Внести запись о резорбции корней зуба #${toothNumber} в карту`}
				>
					<DentalForm043 size={14} />
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
