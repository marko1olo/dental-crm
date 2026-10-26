import React from "react";
import { Check } from "lucide-react";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import { TOOTH_STATES } from "../toothSurfacesConstants";

interface ToothStateChipsRowProps {
	toothData?: ToothData | undefined;
	onStateChange: (state: ToothState) => void;
}

export const ToothStateChipsRow: React.FC<ToothStateChipsRowProps> = ({
	toothData,
	onStateChange,
}) => {
	return (
		<div className="dente-status-chips-grid">
			{TOOTH_STATES.map((st) => {
				const isSelected = (toothData?.state ?? "Healthy") === st.id;
				return (
					<button
						key={st.id}
						type="button"
						onClick={() => onStateChange(st.id)}
						className={`dente-touch-chip ${isSelected ? "active" : ""}`}
						style={{
							borderColor: isSelected ? st.color : undefined,
							color: isSelected ? "var(--on-teal, #ffffff)" : undefined,
							backgroundColor: isSelected ? st.color : undefined,
						}}
						data-testid={`state-chip-${st.id}`}
					>
						<span>{st.label}</span>
						{isSelected && <Check size={13} />}
					</button>
				);
			})}
		</div>
	);
};
