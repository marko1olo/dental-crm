import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import { ODONTOGRAM_VIEW_MODES } from "./OdontogramViewTypes";

export interface OdontogramToolbarModeSelectorsProps {
	readonly activeMode: OdontogramViewMode;
	readonly handleModeSwitch: (mode: OdontogramViewMode) => void;
	readonly onDentitionModeChange?:
		| ((mode: "adult" | "pediatric" | "mixed") => void)
		| undefined;
	readonly currentDentition: "adult" | "pediatric" | "mixed";
}

export const OdontogramToolbarModeSelectors: React.FC<
	OdontogramToolbarModeSelectorsProps
> = ({
	activeMode,
	handleModeSwitch,
	onDentitionModeChange,
	currentDentition,
}) => {
	return (
		<div className="odontogram-toolbar__island odontogram-toolbar__island--left">
			<div className="odontogram-toolbar__segmented">
				{ODONTOGRAM_VIEW_MODES.map((option) => {
					const isActive = activeMode === option.mode;
					return (
						<button
							key={option.mode}
							type="button"
							aria-pressed={isActive}
							title={option.tooltip}
							data-testid={`odontogram-mode-btn-${option.mode}`}
							onClick={() => handleModeSwitch(option.mode)}
							className={`odontogram-toolbar__segment-btn ${isActive ? "odontogram-toolbar__segment-btn--active" : ""}`}
						>
							{option.icon}
							<span>{option.compactLabel || option.shortLabel}</span>
						</button>
					);
				})}
			</div>

			{onDentitionModeChange && (
				<div className="odontogram-toolbar__segmented">
					<button
						type="button"
						onClick={() => onDentitionModeChange("adult")}
						className={`odontogram-toolbar__segment-btn ${currentDentition === "adult" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
						title="Постоянный прикус взрослых (11–48, 32 зуба)"
						data-testid="toolbar-dentition-adult"
						aria-pressed={currentDentition === "adult"}
					>
						<span>Взрослый</span>
					</button>
					<button
						type="button"
						onClick={() => onDentitionModeChange("pediatric")}
						className={`odontogram-toolbar__segment-btn ${currentDentition === "pediatric" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
						title="Детский молочный прикус (51–85, 20 зубов)"
						data-testid="toolbar-dentition-pediatric"
						aria-pressed={currentDentition === "pediatric"}
					>
						<span>Детский</span>
					</button>
					<button
						type="button"
						onClick={() => onDentitionModeChange("mixed")}
						className={`odontogram-toolbar__segment-btn ${currentDentition === "mixed" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
						title="Сменный прикус"
						data-testid="toolbar-dentition-mixed"
						aria-pressed={currentDentition === "mixed"}
					>
						<span>Сменный</span>
					</button>
				</div>
			)}
		</div>
	);
};
