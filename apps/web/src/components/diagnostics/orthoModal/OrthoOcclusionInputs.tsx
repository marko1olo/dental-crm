import React from "react";
import type { OrthodonticPhotoSession, AngleClass } from "@dental/shared";

interface OrthoOcclusionInputsProps {
	session: OrthodonticPhotoSession;
	onFindingsChange: (field: keyof OrthodonticPhotoSession["findings"], value: unknown) => void;
}

export const OrthoOcclusionInputs: React.FC<OrthoOcclusionInputsProps> = ({
	session,
	onFindingsChange,
}) => {
	return (
		<>
			{/* Molar relationship */}
			<div className="ortho-field-group">
				<label className="ortho-field-label">Класс моляров (справа / слева)</label>
				<div className="grid grid-cols-2 gap-2">
					<select
						value={session.findings.angleClassMolarRight}
						onChange={(e) => onFindingsChange("angleClassMolarRight", e.target.value as AngleClass)}
						className="ortho-select"
					>
						<option value="class_1">Пр: I класс</option>
						<option value="class_2_div_1">Пр: II/1 класс</option>
						<option value="class_2_div_2">Пр: II/2 класс</option>
						<option value="class_3">Пр: III класс</option>
					</select>
					<select
						value={session.findings.angleClassMolarLeft}
						onChange={(e) => onFindingsChange("angleClassMolarLeft", e.target.value as AngleClass)}
						className="ortho-select"
					>
						<option value="class_1">Лев: I класс</option>
						<option value="class_2_div_1">Лев: II/1 класс</option>
						<option value="class_2_div_2">Лев: II/2 класс</option>
						<option value="class_3">Лев: III класс</option>
					</select>
				</div>
			</div>

			{/* Overjet & Overbite */}
			<div className="ortho-field-group">
				<label className="ortho-field-label">Сагиттальная щель (Overjet) & Перекрытие (Overbite)</label>
				<div className="grid grid-cols-2 gap-2">
					<div className="ortho-input-unit">
						<input
							type="number"
							step="0.5"
							value={session.findings.overjetMm}
							onChange={(e) => onFindingsChange("overjetMm", Number.parseFloat(e.target.value) || 0)}
							className="ortho-input w-full"
							placeholder="Overjet"
						/>
						<span className="text-xs text-[var(--muted)]">мм</span>
					</div>
					<div className="ortho-input-unit">
						<input
							type="number"
							step="0.5"
							value={session.findings.overbiteMm}
							onChange={(e) => onFindingsChange("overbiteMm", Number.parseFloat(e.target.value) || 0)}
							className="ortho-input w-full"
							placeholder="Overbite"
						/>
						<span className="text-xs text-[var(--muted)]">мм</span>
					</div>
				</div>
			</div>
		</>
	);
};
