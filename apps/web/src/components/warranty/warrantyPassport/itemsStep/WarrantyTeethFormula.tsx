import { Award } from "lucide-react";
import type React from "react";
import type { WarrantyItem } from "../../warrantyEngine.js";
import {
	LOWER_LEFT_TEETH,
	LOWER_RIGHT_TEETH,
	UPPER_LEFT_TEETH,
	UPPER_RIGHT_TEETH,
} from "../constants";

export interface WarrantyTeethFormulaProps {
	selectedTeeth: string[];
	items: WarrantyItem[];
	onToggleTooth: (tooth: string) => void;
}

export const WarrantyTeethFormula: React.FC<WarrantyTeethFormulaProps> = ({
	selectedTeeth,
	items,
	onToggleTooth,
}) => {
	const renderToothButton = (t: string) => {
		const f = `${t[0]}.${t[1]}`;
		const isSel = selectedTeeth.includes(f);
		const hasW = items.some((it) => it.toothNumber === f);
		return (
			<button
				key={t}
				type="button"
				className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
				onClick={() => onToggleTooth(t)}
			>
				{f}
			</button>
		);
	};

	return (
		<div className="warranty-card-section">
			<div className="warranty-section-header">
				<h4>
					<Award size={16} />
					1. Выберите зубы для включения в сертификат:
				</h4>
				<span className="warranty-label truncate min-w-0">
					Выбрано: {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "нет"}
				</span>
			</div>

			<div className="warranty-teeth-formula">
				{/* Верхняя челюсть */}
				<div className="warranty-arch-row">
					{UPPER_RIGHT_TEETH.map(renderToothButton)}
					<div className="warranty-arch-divider" />
					{UPPER_LEFT_TEETH.map(renderToothButton)}
				</div>

				{/* Нижняя челюсть */}
				<div className="warranty-arch-row">
					{LOWER_RIGHT_TEETH.map(renderToothButton)}
					<div className="warranty-arch-divider" />
					{LOWER_LEFT_TEETH.map(renderToothButton)}
				</div>
			</div>
		</div>
	);
};
