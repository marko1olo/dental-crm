import React from "react";
import type { OrthodonticPhotoSession, SmileArcType, MidlineShiftDirection } from "@dental/shared";

interface OrthoEstheticInputsProps {
	session: OrthodonticPhotoSession;
	onFindingsChange: (field: keyof OrthodonticPhotoSession["findings"], value: unknown) => void;
}

export const OrthoEstheticInputs: React.FC<OrthoEstheticInputsProps> = ({
	session,
	onFindingsChange,
}) => {
	return (
		<>
			{/* Smile Arc */}
			<div className="ortho-field-group">
				<label className="ortho-field-label">Дуга улыбки (Smile Arc)</label>
				<select
					value={session.findings.smileArc}
					onChange={(e) => onFindingsChange("smileArc", e.target.value as SmileArcType)}
					className="ortho-select"
				>
					<option value="consonant">Консонантная (эстетический идеал)</option>
					<option value="flat">Уплощенная (прямая линия)</option>
					<option value="reverse">Реверсивная (инвертированная)</option>
				</select>
			</div>

			{/* Midline Shifts */}
			<div className="ortho-field-group">
				<label className="ortho-field-label">Смещение средней линии В/Ч</label>
				<div className="grid grid-cols-2 gap-2">
					<select
						value={session.findings.midlineShiftUpperDirection}
						onChange={(e) => onFindingsChange("midlineShiftUpperDirection", e.target.value as MidlineShiftDirection)}
						className="ortho-select"
					>
						<option value="none">В норме</option>
						<option value="left">Влево</option>
						<option value="right">Вправо</option>
					</select>
					<div className="ortho-input-unit">
						<input
							type="number"
							step="0.5"
							value={session.findings.midlineShiftUpperMm}
							onChange={(e) => onFindingsChange("midlineShiftUpperMm", Number.parseFloat(e.target.value) || 0)}
							className="ortho-input w-full"
						/>
						<span className="text-xs text-[var(--muted)]">мм</span>
					</div>
				</div>
			</div>

			{/* Clinical Diagnosis & Plan */}
			<div className="ortho-field-group col-span-2">
				<label className="ortho-field-label">Клинический диагноз и рекомендации</label>
				<input
					type="text"
					value={session.findings.clinicalDiagnosisRu}
					onChange={(e) => onFindingsChange("clinicalDiagnosisRu", e.target.value)}
					className="ortho-input w-full"
					placeholder="Диагноз по МКБ / СтАР"
				/>
			</div>
		</>
	);
};
