import React from "react";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";
import type {
	OrthodonticPhotoSession,
	AngleClass,
	SmileArcType,
	MidlineShiftDirection,
} from "@dental/shared";

export interface OrthoFindingsAccordionProps {
	session: OrthodonticPhotoSession;
	showFindingsAccordion: boolean;
	onToggleAccordion: () => void;
	onFindingsChange: (field: keyof OrthodonticPhotoSession["findings"], value: unknown) => void;
}

export const OrthoFindingsAccordion: React.FC<OrthoFindingsAccordionProps> = ({
	session,
	showFindingsAccordion,
	onToggleAccordion,
	onFindingsChange,
}) => {
	return (
		<div className="ortho-findings-section">
			<div
				className="ortho-findings-header"
				onClick={onToggleAccordion}
			>
				<div className="ortho-findings-title">
					<Sliders size={16} className="text-[var(--teal)]" />
					<span>Клиническая диагностика и окклюзионные параметры</span>
				</div>
				{showFindingsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
			</div>

			{showFindingsAccordion && (
				<div className="ortho-findings-body">
					{/* Molar relationship */}
					<div className="ortho-field-group">
						<label className="ortho-field-label">Класс моляров (справа / слева)</label>
						<div className="grid grid-cols-2 gap-2">
							<select
								value={session.findings.angleClassMolarRight}
								onChange={(e) =>
									onFindingsChange("angleClassMolarRight", e.target.value as AngleClass)
								}
								className="ortho-select"
							>
								<option value="class_1">Пр: I класс</option>
								<option value="class_2_div_1">Пр: II/1 класс</option>
								<option value="class_2_div_2">Пр: II/2 класс</option>
								<option value="class_3">Пр: III класс</option>
							</select>
							<select
								value={session.findings.angleClassMolarLeft}
								onChange={(e) =>
									onFindingsChange("angleClassMolarLeft", e.target.value as AngleClass)
								}
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
									onChange={(e) =>
										onFindingsChange("overjetMm", Number.parseFloat(e.target.value) || 0)
									}
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
									onChange={(e) =>
										onFindingsChange("overbiteMm", Number.parseFloat(e.target.value) || 0)
									}
									className="ortho-input w-full"
									placeholder="Overbite"
								/>
								<span className="text-xs text-[var(--muted)]">мм</span>
							</div>
						</div>
					</div>

					{/* Smile Arc */}
					<div className="ortho-field-group">
						<label className="ortho-field-label">Дуга улыбки (Smile Arc)</label>
						<select
							value={session.findings.smileArc}
							onChange={(e) =>
								onFindingsChange("smileArc", e.target.value as SmileArcType)
							}
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
								onChange={(e) =>
									onFindingsChange(
										"midlineShiftUpperDirection",
										e.target.value as MidlineShiftDirection,
									)
								}
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
									onChange={(e) =>
										onFindingsChange(
											"midlineShiftUpperMm",
											Number.parseFloat(e.target.value) || 0,
										)
									}
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
							onChange={(e) =>
								onFindingsChange("clinicalDiagnosisRu", e.target.value)
							}
							className="ortho-input w-full"
							placeholder="Диагноз по МКБ / СтАР"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default OrthoFindingsAccordion;
