import type React from "react";
import type { ClinicalWriteoffLine } from "./clinicalWriteoffEngine.js";

export interface ClinicalWriteoffRowStepperProps {
	readonly line: ClinicalWriteoffLine;
	readonly onQuantityChange: (lineId: string, newQty: number) => void;
	readonly onResetToNorm: (lineId: string) => void;
}

export const ClinicalWriteoffRowStepper: React.FC<ClinicalWriteoffRowStepperProps> = ({
	line,
	onQuantityChange,
	onResetToNorm,
}) => {
	const isFractional = line.unit === "г" || line.unit === "мл";
	const stepVal = isFractional ? 0.1 : 1;

	return (
		<td className="text-center">
			<div className="flex items-center justify-center gap-1">
				<div className="cw-stepper-control">
					<button
						type="button"
						className="cw-stepper-btn"
						onClick={() => onQuantityChange(line.id, Math.max(0, line.actualQuantity - stepVal))}
						title="Уменьшить"
					>
						-
					</button>
					<input
						type="number"
						step={stepVal}
						min={0}
						value={line.actualQuantity}
						onChange={(e) => onQuantityChange(line.id, Number(e.target.value))}
						className="cw-stepper-input"
					/>
					<button
						type="button"
						className="cw-stepper-btn"
						onClick={() => onQuantityChange(line.id, line.actualQuantity + stepVal)}
						title="Увеличить"
					>
						+
					</button>
				</div>
			</div>

			<div className="flex items-center justify-center gap-1 mt-1">
				{isFractional ? (
					<>
						<button
							type="button"
							className="cw-chip-btn"
							onClick={() => onQuantityChange(line.id, Number((line.actualQuantity + 0.1).toFixed(2)))}
						>
							+0.1
						</button>
						<button
							type="button"
							className="cw-chip-btn"
							onClick={() => onQuantityChange(line.id, Number((line.actualQuantity + 0.2).toFixed(2)))}
						>
							+0.2
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							className="cw-chip-btn"
							onClick={() => onQuantityChange(line.id, line.actualQuantity + 1)}
						>
							+1
						</button>
						<button
							type="button"
							className="cw-chip-btn"
							onClick={() => onQuantityChange(line.id, line.actualQuantity + 2)}
						>
							+2
						</button>
					</>
				)}
				{line.discrepancyQuantity !== 0 && (
					<button
						type="button"
						className="cw-chip-btn text-teal-dark font-bold"
						onClick={() => onResetToNorm(line.id)}
						title="Сбросить к норме расхода"
					>
						Норма
					</button>
				)}
			</div>
		</td>
	);
};
