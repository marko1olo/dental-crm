import React from "react";
import type { PremiumClinicalDiary } from "./types";
import { type ToothData, type ToothState, TOOTH_STATE_LABELS } from "../../odontogram/ToothChart";
import type { BrandColorPalette } from "../../store/documentBrandingStore";

export interface PremiumPrintClinicalDiaryProps {
	diary: PremiumClinicalDiary;
	palette: BrandColorPalette;
	icd10Label?: string | null | undefined;
	showOdontogramDiagram?: boolean;
	activeTeethWithFindings: readonly ToothData[];
}

export const PremiumPrintClinicalDiary: React.FC<PremiumPrintClinicalDiaryProps> = ({
	diary,
	palette,
	icd10Label,
	showOdontogramDiagram,
	activeTeethWithFindings,
}) => {
	return (
		<div className="doc-soap-container">
			{/* I - Subjective Anamnesis */}
			<div className="doc-soap-section">
				<div className="doc-soap-heading">
					<span>I. Жалобы и анамнез заболевания</span>
				</div>
				<div className="doc-soap-text">
					{diary.anamnesis || "Жалоб на момент осмотра активно не предъявляет."}
				</div>
			</div>

			{/* II - Objective Status Localis */}
			<div className="doc-soap-section">
				<div className="doc-soap-heading">
					<span>II. Объективный осмотр и статус полости рта (Status localis)</span>
				</div>
				<div className="doc-soap-text">
					{diary.statusLocalis || "Слизистая оболочка полости рта физиологической окраски, без патологических элементов."}
				</div>

				{showOdontogramDiagram && activeTeethWithFindings.length > 0 && (
					<div className="doc-odontogram-box">
						<div className="text-[11px] font-bold text-[var(--doc-primary-dark)] uppercase tracking-wider">
							Зубная формула и выявленные патологии (FDI):
						</div>
						<div className="doc-teeth-formula-grid">
							{activeTeethWithFindings.map((tooth) => (
								<span key={tooth.toothNumber} className="doc-tooth-pill">
									<strong>Зуб {tooth.toothNumber}:</strong> {TOOTH_STATE_LABELS[tooth.state as ToothState] || tooth.state}
									{tooth.surfaces && tooth.surfaces.length > 0 ? ` (${tooth.surfaces.join(", ")})` : ""}
								</span>
							))}
						</div>
					</div>
				)}
			</div>

			{/* III - ICD-10 Clinical Diagnosis */}
			<div className="doc-soap-section">
				<div className="doc-soap-heading">
					<span>III. Клинический диагноз по МКБ-10</span>
				</div>
				<div className="doc-soap-text">
					<strong>Код МКБ-10:</strong>{" "}
					<span className="px-2 py-0.5 rounded font-mono font-bold text-white text-xs inline-block" style={{ backgroundColor: palette.primary }}>
						{diary.diagnosisIcd10 || "Z01.2"}
					</span>{" "}
					{icd10Label ? `— ${icd10Label}` : ""}{" "}
					{diary.diagnosisTooth ? `(Зуб FDI: № ${diary.diagnosisTooth})` : ""}
				</div>
			</div>

			{/* IV - Treatment Protocol & Recommendations */}
			<div className="doc-soap-section">
				<div className="doc-soap-heading">
					<span>IV. Протокол оказанной медицинской помощи и назначения</span>
				</div>
				<div className="doc-soap-text">
					{diary.treatmentDescription || "Проведена консультация, составлен предварительный план лечения."}
				</div>
			</div>

			{/* Complications & Comorbidities */}
			{(diary.complications || diary.comorbidities) && (
				<div className="doc-soap-section">
					<div className="doc-soap-heading">
						<span>Осложнения и сопутствующая соматическая патология</span>
					</div>
					<div className="doc-soap-text">
						{diary.complications && <div>• Осложнения: {diary.complications}</div>}
						{diary.comorbidities && <div>• Сопутствующие заболевания: {diary.comorbidities}</div>}
					</div>
				</div>
			)}
		</div>
	);
};
