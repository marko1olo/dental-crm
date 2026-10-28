import React from "react";
import type { ToothState } from "../../odontogram/ToothChart";

interface ToothDrawerStateStripProps {
	currentState: ToothState;
	onQuickStateSelect: (state: ToothState) => void;
}

const TOOTH_STATE_OPTIONS = [
	{ state: "Healthy", label: "Здоров" },
	{ state: "Caries", label: "Кариес" },
	{ state: "Filled", label: "Пломба" },
	{ state: "Pulpitis", label: "Пульпит" },
	{ state: "Periodontitis", label: "Периодонтит" },
	{ state: "Crown", label: "Коронка" },
	{ state: "Implant", label: "Имплант" },
	{ state: "Planned_Implant", label: "Имплант (план)" },
	{ state: "Missing", label: "Отсутствует" },
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
