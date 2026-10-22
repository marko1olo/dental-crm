import React from "react";
import type { ToothState } from "../../odontogram/ToothChart";

interface ToothDrawerStateStripProps {
	currentState: ToothState;
	onQuickStateSelect: (state: ToothState) => void;
}

const TOOTH_STATE_OPTIONS = [
	{ state: "Healthy", label: "Здоров (0)" },
	{ state: "Caries", label: "Кариес (C)" },
	{ state: "Filled", label: "Пломба (F)" },
	{ state: "Pulpitis", label: "Пульпит (P)" },
	{ state: "Periodontitis", label: "Периодонтит (Pt)" },
	{ state: "Crown", label: "Коронка (Cr)" },
	{ state: "Implant", label: "Имплант (Imp)" },
	{ state: "Planned_Implant", label: "Имплант (план)" },
	{ state: "Missing", label: "Отсутствует (X)" },
] as const;

export const ToothDrawerStateStrip: React.FC<ToothDrawerStateStripProps> = ({
	currentState,
	onQuickStateSelect,
}) => {
	return (
		<div className="dente-drawer-state-strip" role="group" aria-label="Клинический статус зуба">
			{TOOTH_STATE_OPTIONS.map((opt) => {
				const isSelected = currentState === opt.state;
				return (
					<button
						key={opt.state}
						type="button"
						onClick={() => onQuickStateSelect(opt.state as ToothState)}
						className={`dente-state-quick-chip ${isSelected ? "active" : ""}`}
						data-testid={`tooth-card-state-${opt.state}`}
						title={opt.label}
					>
						<span>{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
};
