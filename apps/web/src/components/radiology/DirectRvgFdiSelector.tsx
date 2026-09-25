import React from "react";
import { Sparkles } from "lucide-react";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES } from "./radiologyMath";

export interface DirectRvgFdiSelectorProps {
	selectedTeeth: string[];
	onToothToggle: (tooth: string) => void;
	primaryTooth: string;
	primaryToothName: string;
}

export const DirectRvgFdiSelector: React.FC<DirectRvgFdiSelectorProps> = ({
	selectedTeeth,
	onToothToggle,
	primaryTooth,
	primaryToothName,
}) => {
	return (
		<div className="rvg-dock-section">
			<div className="rvg-section-header">
				<span className="rvg-section-header-title">
					<Sparkles className="w-3.5 h-3.5" />
					Зубная формула (FDI 11–48)
				</span>
				<span className="font-mono text-teal-400 font-bold">
					{selectedTeeth.join(", ")}
				</span>
			</div>

			<div className="rvg-fdi-selector-panel" data-testid="rvg-fdi-selector-panel">
				{/* Upper Jaw: Quadrant 1 (18-11) | Quadrant 2 (21-28) */}
				<div className="rvg-fdi-jaw-row">
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => onToothToggle(tooth)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant2.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => onToothToggle(tooth)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
				</div>

				{/* Lower Jaw: Quadrant 4 (48-41) | Quadrant 3 (31-38) */}
				<div className="rvg-fdi-jaw-row">
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant4.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => onToothToggle(tooth)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant3.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => onToothToggle(tooth)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
				</div>

				{/* Selected Tooth Description */}
				<div className="rvg-selected-tooth-badge min-w-0">
					<span className="truncate">{primaryToothName}</span>
					<span className="font-mono text-[11px] opacity-80 shrink-0">
						FDI #{primaryTooth}
					</span>
				</div>
			</div>
		</div>
	);
};
